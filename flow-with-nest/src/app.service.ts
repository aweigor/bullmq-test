import { InjectFlowProducer, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Queue, QueueEvents } from 'bullmq';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name, { timestamp: true });
  constructor(
    @InjectFlowProducer('flow-producer')
    private flowProducer: FlowProducer,
    @InjectQueue('root') private rootQueue: Queue,
    @InjectQueue('nested') private nestedQueue: Queue,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }
  async runJob() {
    const childData = [
      'banana',
      'orange',
      'apple',
      'coconut',
      'bear',
      'strawberry',
      'watermelon',
    ].map((x, i) => {
      return {
        idx: i,
        name: x,
      };
    });
    const flowJob = await this.flowProducer.add({
      name: 'main',
      queueName: 'root',
      data: {
        message: 'hello',
      },
      children: childData.map((data) => {
        return {
          name: data.name,
          data,
          queueName: 'nested',
          opts: {
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            attempts: 3,
          },
        };
      }),
    });
    try {
      await flowJob.job.waitUntilFinished(new QueueEvents('root'), 5000);
    } catch (ex: any) {
      this.logger.error(ex);
      if (!Array.isArray(flowJob.children)) return;
      for (const child of flowJob.children) {
        const isCompleted = await child.job.isCompleted();
        if (!isCompleted) {
          // dlq
          await child.job.remove();
        }
      }
    }
  }
}
