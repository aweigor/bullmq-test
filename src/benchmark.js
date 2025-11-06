import { WebhookProducer } from "./producer.js";
import { Queue } from "bullmq";
import Table from "cli-table3";
import chalk from "chalk";
// import { pipelineWorker } from "./pipeline-worker.js";
// import { pipelineWorkerGranular } from "./pipeline-worker-granular.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

class PipelineBenchmark {
  constructor() {
    this.producer = new WebhookProducer();
    this.pipelineQueue = new Queue("webhook-pipeline", { connection });
    this.pipelineGranularQueue = new Queue("webhook-pipeline-granular", {
      connection,
    });
  }

  async runScenario(name, webhooks, middlewares) {
    console.log(chalk.blue(`Running: ${name}`));

    const results = await this.producer.produceBulk(webhooks, middlewares);

    const resultsGranular = await this.producer.produceBulkGranular(
      webhooks,
      middlewares
    );

    // Wait for pipeline processing to complete
    const { elapsedTime } = await this.waitForPipelineCompletion(
      webhooks.length
    );

    // Wait for granular pipeline processing to complete
    const { elapsedTimeGranular } =
      await this.waitForGranularPipelineCompletion(
        webhooks.length * middlewares.length
      );

    const throughput = (webhooks.length / elapsedTime) * 1000;
    const throughputGranular = (webhooks.length / elapsedTimeGranular) * 1000;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0);

    const avgDurationGranular = resultsGranular.reduce(
      (sum, r) => sum + r.duration,
      0
    );

    return {
      name,
      middlewares: middlewares.join(", "),
      throughput: Math.round(throughput * 100) / 100,
      throughputGranular: Math.round(throughputGranular * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
      avgDurationGranular: Math.round(avgDurationGranular * 100) / 100,
      totalDuration: Math.round(elapsedTime),
    };
  }

  async waitForPipelineCompletion(expectedCount, timeout = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const counts = await this.pipelineQueue.getJobCounts();
      const completed = counts.completed || 0;
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (completed >= expectedCount) {
        console.log("COMPLETED", completed, expectedCount);
        return {
          elapsedTime: Date.now() - start,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const counts = await this.pipelineQueue.getJobCounts();
    throw new Error(
      `Timeout waiting for pipeline completion. Expected ${expectedCount} jobs, got ${
        counts.completed || 0
      } completed.`
    );
  }

  async waitForGranularPipelineCompletion(expectedCount, timeout = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const counts = await this.pipelineGranularQueue.getJobCounts();
      const completed = counts.completed || 0;
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (completed >= expectedCount) {
        return {
          elapsedTimeGranular: Date.now() - start,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const counts = await this.pipelineGranularQueue.getJobCounts();
    throw new Error(
      `Timeout waiting for granular pipeline completion. Expected ${expectedCount} jobs, got ${
        counts.completed || 0
      } completed.`
    );
  }

  printResults(results) {
    console.log(chalk.green("\n🎯 PIPELINE BENCHMARK RESULTS\n"));

    const table = new Table({
      head: [
        chalk.cyan("Scenario"),
        chalk.cyan("Middlewares"),
        chalk.cyan("Throughput (req/s)"),
        chalk.cyan("Avg Duration (ms)"),
      ],
    });

    results.forEach((result) => {
      table.push([
        result.name,
        result.middlewares,
        result.throughput,
        result.avgDuration,
      ]);
    });

    const table2 = new Table({
      head: [
        chalk.cyan("Scenario"),
        chalk.cyan("Middlewares"),
        chalk.cyan("Throughput (req/s)"),
        chalk.cyan("Avg Duration (ms)"),
      ],
    });

    results.forEach((result) => {
      table2.push([
        result.name,
        result.middlewares,
        result.throughputGranular,
        result.avgDurationGranular,
      ]);
    });

    console.log("scenario result for single webhook queue");
    console.log(table.toString());
    console.log("scenario result for granular webhook queue");
    console.log(table2.toString());

    const best = results.reduce((best, current) =>
      current.throughput > best.throughput ? current : best
    );

    console.log(chalk.yellow(`\n💡 Best performance: ${best.name}`));
    console.log(chalk.yellow(`   Throughput: ${best.throughput} req/s`));
    console.log(chalk.yellow(`   Middlewares: ${best.middlewares}`));
  }
}

// Test data
function generateWebhooks(count) {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://api.example.com/webhook/${i}`,
    payload: { event: "test", id: i, timestamp: Date.now() },
  }));
}

// Test scenarios
const scenarios = [
  {
    name: "Only Sync",
    middlewares: ["validate", "transform", "addMetadata"],
  },
  {
    name: "Sync + Light Async",
    middlewares: ["validate", "transform", "rateLimit"],
  },
  {
    name: "Sync + Heavy Async",
    middlewares: ["validate", "transform", "enrich", "heavyProcessing"],
  },
  {
    name: "Minimal",
    middlewares: ["validate"],
  },
];

async function main() {
  // Start workers
  //console.log(chalk.yellow("Starting workers..."));
  // Workers are started when imported

  // Give workers a moment to initialize
  await new Promise((resolve) => setTimeout(resolve, 100));

  const benchmark = new PipelineBenchmark();
  const testWebhooks = generateWebhooks(1000000);
  const results = [];

  for (const scenario of scenarios) {
    const result = await benchmark.runScenario(
      scenario.name,
      testWebhooks.slice(0, 20), // Smaller batch for quick testing
      scenario.middlewares
    );
    results.push(result);
  }

  benchmark.printResults(results);

  // Close workers gracefully
  // await pipelineWorker.close();
  // await pipelineWorkerGranular.close();

  process.exit(0);
}

main().catch(console.error);
