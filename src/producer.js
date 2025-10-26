import { Queue } from "bullmq";
import { randomUUID } from "crypto";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

export class WebhookProducer {
  constructor() {
    this.pipelineQueue = new Queue("webhook-pipeline", { connection });
    this.sendingQueue = new Queue("webhook-sending", { connection });
  }

  async produceWebhook(rawWebhook, middlewares = ["validate", "transform"]) {
    const startTime = process.hrtime.bigint();
    const webhookId = randomUUID();

    try {
      // Add to pipeline queue for middleware processing
      const pipelineJob = await this.pipelineQueue.add(
        "process-middlewares",
        {
          rawWebhook,
          webhookId,
          middlewares,
          metadata: {
            receivedAt: new Date().toISOString(),
          },
        },
        {
          jobId: `pipeline-${webhookId}`,
          removeOnComplete: 100,
        }
      );

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      return {
        success: true,
        webhookId,
        jobId: pipelineJob.id,
        duration,
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      return {
        success: false,
        webhookId,
        error: error.message,
        duration,
      };
    }
  }

  async produceBulk(webhooks, middlewares = ["validate", "transform"]) {
    const results = [];

    for (const webhook of webhooks) {
      const result = await this.produceWebhook(webhook, middlewares);
      results.push(result);
    }

    return results;
  }
}
