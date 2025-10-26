#!/bin/bash

set -e

echo "🧪 Running benchmark..."

# Rebuild the image to ensure it's current
echo "📦 Building Docker image..."
docker build -t webhook-pipeline:latest . > /dev/null 2>&1
echo "✅ Image built successfully"

# Delete any existing benchmark job
echo "🗑️  Cleaning up previous benchmark..."
kubectl delete job pipeline-benchmark --ignore-not-found=true > /dev/null 2>&1

# Wait a moment for cleanup
sleep 2

echo "🚀 Starting new benchmark job..."
kubectl apply -f k8s/benchmark-job.yaml

echo "⏳ Waiting for benchmark pod to start..."
for i in {1..30}; do
  POD_STATUS=$(kubectl get pods -l job-name=pipeline-benchmark -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Waiting")
  if [ "$POD_STATUS" = "Running" ] || [ "$POD_STATUS" = "Succeeded" ] || [ "$POD_STATUS" = "Failed" ]; then
    break
  fi
  echo "Still waiting for pod to start... ($i/30)"
  sleep 2
done

echo ""
echo "📊 Current pod status:"
kubectl get pods -l job-name=pipeline-benchmark

echo ""
echo "📋 Streaming logs:"
kubectl logs -f job/pipeline-benchmark

echo ""
echo "🎯 Benchmark completed!"