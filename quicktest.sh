kubectl run quick-test --image=webhook-pipeline:latest --image-pull-policy=Never --rm -it --restart=Never -- \
  node -e "
    const { WebhookProducer } = require('./src/producer.js');
    
    async function test() {
      console.log('🚀 Testing webhook producer...');
      const producer = new WebhookProducer();
      
      const result = await producer.produceWebhook({
        url: 'https://httpbin.org/post',
        payload: { test: true, timestamp: Date.now() }
      }, ['validate', 'transform']);
      
      console.log('✅ Producer test result:', result);
      
      // Check if job made it to the queue
      const queue = require('bullmq').Queue;
      const webhookQueue = new queue('webhook-pipeline', {
        connection: { host: 'redis', port: 6379 }
      });
      
      const counts = await webhookQueue.getJobCounts();
      console.log('📊 Queue counts:', counts);
    }
    
    test().catch(err => {
      console.error('❌ Test failed:', err);
      process.exit(1);
    });
  "