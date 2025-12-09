import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue('root') private rootQueue: Queue,
    @InjectQueue('nested') private nestedQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('run-job')
  runJob() {
    return this.appService.runJob();
  }

  @Get('queues/status')
  async getQueueStatus() {
    const parentJobs = await this.rootQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
    ]);
    const childJobs = await this.nestedQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
    ]);

    return {
      parentQueue: {
        name: 'parent-queue',
        waiting: await this.rootQueue.getWaitingCount(),
        active: await this.rootQueue.getActiveCount(),
        completed: await this.rootQueue.getCompletedCount(),
        failed: await this.rootQueue.getFailedCount(),
        jobs: parentJobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
        })),
      },
      childQueue: {
        name: 'child-queue',
        waiting: await this.nestedQueue.getWaitingCount(),
        active: await this.nestedQueue.getActiveCount(),
        completed: await this.nestedQueue.getCompletedCount(),
        failed: await this.nestedQueue.getFailedCount(),
        jobs: childJobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
        })),
      },
    };
  }
}
