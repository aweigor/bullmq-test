import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { FlowProducer } from 'bullmq';

@Injectable()
export class AppService {
  constructor(
    @InjectFlowProducer('flow-producer')
    private flowProducer: FlowProducer,
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
      'beer',
      'strawberry',
      'watermelon',
    ].map((x, i) => {
      return {
        idx: i,
        name: x,
      };
    });
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
          opts: {
            removeOnFail: true,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            attempts: 3,
          },
        };
      }),
    });
  }
}
