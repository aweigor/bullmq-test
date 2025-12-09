import { Worker } from "bullmq";
import { syncMiddlewares, asyncMiddlewares } from "./middleware.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

const pipelineWorker = new Worker(
  "webhook-pipeline",
  async (job) => {
    const { rawWebhook, middlewares, webhookId } = job.data;
    const startTime = process.hrtime.bigint();

    try {
      let processedWebhook = { ...rawWebhook };
      const timing = {};

      for (const middlewareName of middlewares) {
        const mwStart = process.hrtime.bigint();

        if (syncMiddlewares[middlewareName]) {
          processedWebhook = syncMiddlewares[middlewareName](processedWebhook);
        } else if (asyncMiddlewares[middlewareName]) {
          processedWebhook = await asyncMiddlewares[middlewareName](
            processedWebhook
          );
        } else {
          throw new Error(`Unknown middleware: ${middlewareName}`);
        }

        const mwEnd = process.hrtime.bigint();
        timing[middlewareName] = Number(mwEnd - mwStart) / 1000000;
      }

      const endTime = process.hrtime.bigint();
      const totalDuration = Number(endTime - startTime) / 1000000;

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

console.log("Pipeline worker started");

export { pipelineWorker };
