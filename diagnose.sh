#!/bin/bash

echo "🔍 Running OrbStack/Kubernetes diagnostics..."

echo "1. Checking OrbStack status..."
orbctl status

echo ""
echo "2. Checking Kubernetes nodes..."
kubectl get nodes -o wide

echo ""
echo "3. Checking all system pods..."
kubectl get pods -A -o wide

echo ""
echo "4. Checking system events..."
kubectl get events -A --sort-by=.lastTimestamp | tail -10

echo ""
echo "5. Checking network policies..."
kubectl get networkpolicies -A

echo ""
echo "6. Checking storage classes..."
kubectl get storageclass

echo ""
echo "7. OrbStack version info..."
orbctl version