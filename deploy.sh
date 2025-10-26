#!/bin/bash

set -e

echo "🚀 Building Docker image..."
docker build -t webhook-pipeline:latest .

echo "🔧 Deploying to Kubernetes..."
kubectl apply -f k8s/redis.yaml

echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis --timeout=120s

echo "📦 Deploying workers with local image..."
kubectl apply -f k8s/pipeline-worker.yaml
kubectl apply -f k8s/sender-worker.yaml

echo "🔍 Checking deployment status..."
sleep 10
kubectl get pods -l app=pipeline-worker
kubectl get pods -l app=sender-worker

echo "✅ Deployment complete!"
echo ""
echo "To check logs:"
echo "  kubectl logs -l app=pipeline-worker --tail=10"
echo "  kubectl logs -l app=sender-worker --tail=10"