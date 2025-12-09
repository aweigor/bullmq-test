import { OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
@Processor('children')
export class ChildProcessor extends WorkerHost {
  private readonly logger = new Logger(ChildProcessor.name, {
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
      message: 'child job processing',
      jobData: job.data,
    });
    // await new Promise((r) => {
    //   setTimeout(r, 1000);
    // });
    await job.updateData({
      success: true,
    });
  }
}
