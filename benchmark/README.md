# Benchmark

Measures end-to-end SWAP order processing performance.

## Local

```bash
bun run build
bun start -- --orders 100 --concurrency 10 --skip-delays
```

**Options:**

- `--orders <n>` - Number of orders (default: 10)
- `--concurrency <n>` - Concurrent requests (default: 1)
- `--behaviour <type>` - `success`, `payment-failure`, or `inventory-failure`
- `--product-ids <ids>` - Comma-separated product IDs (default: laptop,mouse,keyboard,monitor)
- `--skip-delays` - Skip processing delays for max throughput

**Note:** Inventory is automatically seeded at the start of each benchmark run.

## GKE (from your machine)

```bash
# Run benchmark in GKE
kubectl delete job swap-benchmark -n swap --ignore-not-found
kubectl apply -f manifests/benchmark-job.yaml

# Watch live
kubectl logs -f job/swap-benchmark -n swap
```

**Options:** Edit `manifests/benchmark-job.yaml` args section to change orders, concurrency, product IDs, etc.
