import { WebhookProducer } from "./producer.js";
import { Queue } from "bullmq";
import Table from "cli-table3";
import chalk from "chalk";

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

    const { elapsedTime } = await this.waitForPipelineCompletion(
      webhooks.length
    );

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
      throughput: Math.round(throughput * 100),
      throughputGranular: Math.round(throughputGranular * 100),
      avgDuration: Math.round(avgDuration * 100) / webhooks.length,
      avgDurationGranular:
        Math.round(avgDurationGranular * 100) / webhooks.length,
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
    console.log(chalk.green("\nPIPELINE BENCHMARK RESULTS\n"));

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

    console.log(chalk.yellow(`\n Best performance: ${best.name}`));
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
  await new Promise((resolve) => setTimeout(resolve, 100));

  for (const amount of [100, 1000, 10000]) {
    const benchmark = new PipelineBenchmark();
    const testWebhooks = generateWebhooks(amount);
    const results = [];

    for (const scenario of scenarios) {
      const result = await benchmark.runScenario(
        scenario.name,
        testWebhooks,
        scenario.middlewares
      );
      results.push(result);
    }

    benchmark.printResults(results);
  }

  process.exit(0);
}

main().catch(console.error);
