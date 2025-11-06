#!/bin/bash

set -e

echo "🔍 Checking OrbStack and Kubernetes status..."

# Check if OrbStack is running
if ! orbctl status > /dev/null 2>&1; then
  echo "❌ OrbStack is not running. Please start OrbStack first."
  exit 1
fi

# Check if Kubernetes is accessible
if ! kubectl cluster-info > /dev/null 2>&1; then
  echo "❌ Kubernetes is not accessible."
  echo "   Please enable Kubernetes in OrbStack:"
  echo "   1. Open OrbStack"
  echo "   2. Go to Preferences → Kubernetes" 
  echo "   3. Enable Kubernetes and click Apply"
  exit 1
fi

echo "✅ OrbStack and Kubernetes are running"

# docker build -t webhook-benchmark:latest .

docker build --network=host -t webhook-benchmark:latest . && exit 0

# echo "Trying with Alpine base..."
# docker build -f Dockerfile.alpine -t webhook-benchmark:latest . && exit 0

echo "🔧 Deploying Redis..."
kubectl apply -f k8s/redis.yaml --validate=false

echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis --timeout=120s

echo "✅ Redis is ready!"

echo ""
echo "To deploy workers and run benchmark:"
echo "  kubectl apply -f k8s/pipeline-worker.yaml --validate=false"
echo "  kubectl apply -f k8s/pipeline-worker-granular.yaml --validate=false"
echo "  kubectl apply -f k8s/benchmark-job.yaml --validate=false"
echo "  kubectl logs -f job/benchmark-runner"