# Make scripts executable

chmod +x deploy.sh run-benchmark.sh cleanup.sh

# Deploy everything

./deploy.sh

# Run benchmark

./run-benchmark.sh

# Clean up

./cleanup.sh

# Check OrbStack status

orbctl status

# Check Kubernetes nodes

kubectl get nodes

# Check if we can access cluster

kubectl cluster-info

# View OrbStack dashboard

open orbstack://dashboard

# View Kubernetes dashboard

orbctl dashboard

# Check resource usage

orbctl stats

# View logs for all pods

kubectl logs -l app=pipeline-worker --tail=10
kubectl logs -l app=sender-worker --tail=10

kubectl run test-producer --image=webhook-pipeline:latest --rm -it --restart=Never -- \
 node -e "
const { WebhookProducer } = require('./src/producer.js');
const producer = new WebhookProducer();

    async function test() {
      const result = await producer.produceWebhook({
        url: 'https://httpbin.org/post',
        payload: { test: true }
      }, ['validate', 'transform']);

      console.log('Test result:', result);
    }

    test().catch(console.error);

"

# Build the image

docker build -t webhook-pipeline-benchmark .

# If using Docker Desktop, the image is already available to Kubernetes

# If using Minikube, load the image:

minikube image load webhook-pipeline-benchmark

# Install Docker Desktop from https://www.docker.com/products/docker-desktop/

# Enable Kubernetes in Docker Desktop preferences

# Verify

kubectl get nodes

# Deploy

kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/workers.yaml
kubectl apply -f k8s/benchmark.yaml

# Check results

kubectl logs -f job/pipeline-benchmark

# Test the producer manually

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
