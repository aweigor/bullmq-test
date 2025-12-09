import { InjectFlowProducer, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Queue } from 'bullmq';

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
    try {
      await this.flowProducer.add({
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
          };
        }),
      });
    } catch (ex) {
      this.logger.error(ex);
    }
  }
}
