import { OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('root')
export class RootProcessor extends WorkerHost {
  private readonly logger = new Logger(RootProcessor.name, {
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
      message: 'root job processing',
      jobData: job.data,
      jobChildren: await job.getChildrenValues(),
    });
    console.log('RootProcessor');
    await job.updateData({
      success: true,
    });
  }
}
