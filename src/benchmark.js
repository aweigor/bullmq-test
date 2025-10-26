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
    this.sendingQueue = new Queue("webhook-sending", { connection });
  }

  async runScenario(name, webhooks, middlewares) {
    console.log(chalk.blue(`Running: ${name}`));

    const startTime = process.hrtime.bigint();
    const results = await this.producer.produceBulk(webhooks, middlewares);
    const endTime = process.hrtime.bigint();

    const totalDuration = Number(endTime - startTime) / 1000000;
    const successful = results.filter((r) => r.success).length;

    // Wait for pipeline processing to complete
    await this.waitForPipelineCompletion(webhooks.length);

    const throughput = (webhooks.length / totalDuration) * 1000;
    const successRate = (successful / webhooks.length) * 100;
    const avgDuration =
      results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    return {
      name,
      middlewares: middlewares.join(", "),
      throughput: Math.round(throughput * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      totalDuration: Math.round(totalDuration),
    };
  }

  async waitForPipelineCompletion(expectedCount, timeout = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const completed = await this.pipelineQueue.getCompleted();
      if (completed.length >= expectedCount) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  printResults(results) {
    console.log(chalk.green("\n🎯 PIPELINE BENCHMARK RESULTS\n"));

    const table = new Table({
      head: [
        chalk.cyan("Scenario"),
        chalk.cyan("Middlewares"),
        chalk.cyan("Throughput (req/s)"),
        chalk.cyan("Avg Duration (ms)"),
        chalk.cyan("Success Rate (%)"),
      ],
    });

    results.forEach((result) => {
      table.push([
        result.name,
        result.middlewares,
        result.throughput,
        result.avgDuration,
        result.successRate,
      ]);
    });

    console.log(table.toString());

    // Find best configuration
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
    name: "All Middlewares",
    middlewares: [
      "validate",
      "transform",
      "addMetadata",
      "sign",
      "rateLimit",
      "enrich",
    ],
  },
  {
    name: "Minimal",
    middlewares: ["validate"],
  },
];

async function main() {
  const benchmark = new PipelineBenchmark();
  const testWebhooks = generateWebhooks(100);
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
  process.exit(0);
}

main().catch(console.error);
