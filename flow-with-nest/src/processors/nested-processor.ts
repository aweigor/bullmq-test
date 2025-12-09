import { OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('nested')
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
  async process(job: Job<any>): Promise<void> {
    this.logger.debug({
      message: 'nested job processing',
      jobData: job.data,
    });
    await new Promise((r) => {
      setTimeout(r, 1000);
    });
    console.log('NestedProcessor');
    await job.updateData({
      success: true,
    });
  }
}
