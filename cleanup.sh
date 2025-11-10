#!/bin/bash

echo "Cleaning up..."
kubectl delete -f k8s/ --ignore-not-found=true
kubectl delete job pipeline-benchmark --ignore-not-found=true