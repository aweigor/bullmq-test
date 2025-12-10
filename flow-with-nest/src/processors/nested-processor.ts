import {
  OnQueueEvent,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('nested', { concurrency: 10 })
export class NestedProcessor extends WorkerHost {
  private readonly logger = new Logger(NestedProcessor.name, {
    timestamp: true,
  });
  @OnQueueEvent('active')
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    console.log(
      `OnWorkerEvent job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
  async process(job: Job<any>): Promise<any> {
    this.logger.debug({
      message: 'nested job processing',
      jobData: job.data,
      attemptsMade: job.attemptsMade,
    });
    await new Promise((r) => {
      setTimeout(r, 1000);
    });

    try {
      const rand = Math.random();
      if (rand > 0.5) {
        throw new Error();
      }
    } catch (ex) {
      const result = {
        success: false,
      };
      const maxAttempts = job.opts.attempts || 1;
      // attemptsMade + current attempt
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
      if (isFinalAttempt) {
        // dlq
        return result;
      } else {
        throw ex;
      }
    }

    await job.updateData({
      success: true,
    });
    return {
      success: true,
    };
  }
}
