import { Worker } from "bullmq";
import { syncMiddlewares, asyncMiddlewares } from "./middleware.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

const pipelineWorkerGranular = new Worker(
  "webhook-pipeline-granular",
  async (job) => {
    const { rawWebhook, middleware, webhookId } = job.data;
    const startTime = process.hrtime.bigint();

    try {
      let processedWebhook = { ...rawWebhook };
      const timing = {};

      const mwStart = process.hrtime.bigint();

      if (syncMiddlewares[middleware]) {
        // Sync middleware
        processedWebhook = syncMiddlewares[middleware](processedWebhook);
      } else if (asyncMiddlewares[middleware]) {
        // Async middleware
        processedWebhook = await asyncMiddlewares[middleware](processedWebhook);
      } else {
        throw new Error(`Unknown middleware: ${middleware}`);
      }

      const mwEnd = process.hrtime.bigint();
      timing[middleware] = Number(mwEnd - mwStart) / 1000000;

      const endTime = process.hrtime.bigint();
      const totalDuration = Number(endTime - startTime) / 1000000;

      // Pass to sending queue
      await job.updateData({
        ...job.data,
        processedWebhook,
        timing,
        totalDuration,
      });

      return {
        success: true,
        processedWebhook,
        timing,
        totalDuration,
        webhookId,
      };
    } catch (error) {
      throw new Error(`Pipeline failed: ${error.message}`);
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.PIPELINE_CONCURRENCY) || 5,
  }
);

console.log("Pipeline granular worker started");

export { pipelineWorkerGranular };
