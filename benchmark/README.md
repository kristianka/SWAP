# Benchmark

Measures end-to-end SWAP order processing performance.

## Local

```bash
bun i
bun run dev -- --orders 100 --concurrency 10 --skip-delays
```

## GKE

Run locally, make sure you are connected to GKE.

```bash
# Run benchmark in GKE
kubectl delete job swap-benchmark -n swap --ignore-not-found
kubectl apply -f manifests/benchmark-job.yaml

# Watch live
kubectl logs -f job/swap-benchmark -n swap
```
