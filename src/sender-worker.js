import { Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

const senderWorker = new Worker(
  "webhook-sending",
  async (job) => {
    const { processedWebhook, webhookId } = job.data;
    const startTime = process.hrtime.bigint();

    try {
      // Simulate HTTP request
      await new Promise((resolve) =>
        setTimeout(resolve, 10 + Math.random() * 20)
      );

      // Simulate occasional failures (5% failure rate)
      if (Math.random() < 0.05) {
        throw new Error("HTTP 500 - Server error");
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      return {
        success: true,
        webhookId,
        duration,
        status: "delivered",
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      throw new Error(`Send failed: ${error.message}`);
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.SENDER_CONCURRENCY) || 10,
  }
);

console.log("Sender worker started");
