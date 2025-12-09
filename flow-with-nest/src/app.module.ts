import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { RootProcessor } from './processors/root-processor';
import { ChildProcessor, FlowProducer } from 'bullmq';
import {
  CHILD_QUEUE_NAME,
  FLOW_PRODUCER_NAME,
  PARENT_QUEUE_NAME,
} from './contstants';
import { NestedProcessor } from './processors/nested-processor';

export { CHILD_QUEUE_NAME, FLOW_PRODUCER_NAME, PARENT_QUEUE_NAME };

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),

    BullModule.registerQueue({
      name: 'root',
    }),
    BullModule.registerQueue({
      name: 'nested',
      defaultJobOptions: {
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        attempts: 3,
      },
    }),
    BullModule.registerQueue({
      name: 'children',
      defaultJobOptions: {
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        attempts: 3,
      },
    }),
    BullModule.registerFlowProducer({
      name: 'flow-producer',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RootProcessor,
    NestedProcessor,
    ChildProcessor,
    FlowProducer,
  ],
})
export class AppModule {}
