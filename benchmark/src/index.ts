#!/usr/bin/env node

/**
 * SWAP Order Processing Benchmark
 * Measures end-to-end latency from order creation to completion
 *
 * Usage:
 *   npm run dev -- [options]
 *   npm start -- [options]
 *
 * Options:
 *   --url <url>          Order service URL (default: http://localhost:3001)
 *   --orders <n>         Number of orders to create (default: 10)
 *   --concurrency <n>    Concurrent requests (default: 1)
 *   --behaviour <type>   Order behaviour: success|payment-failure|inventory-failure (default: success)
 *   --product-ids <ids>  Comma-separated product IDs (default: laptop,mouse,keyboard,monitor)
 *   --skip-delays        Skip artificial processing delays (for max throughput testing)
 */

import type { BenchmarkConfig, ProcessOrderResult } from "./types.js";
import { parseArgs } from "./config.js";
import { metrics, printStats } from "./metrics.js";
import { processSingleOrder } from "./order-operations.js";

async function seedInventory(baseUrl: string): Promise<void> {
  // Convert order service URL to inventory service URL
  // http://order-service-svc:3001 -> http://inventory-service-svc:3002
  // http://localhost:3001 -> http://localhost:3002
  const inventoryUrl = baseUrl
    .replace(/order-service-svc:3001/, "inventory-service-svc:3002")
    .replace(/order-service:3001/, "inventory-service:3002")
    .replace(/:3001/, ":3002");
  const seedUrl = `${inventoryUrl}/inventory/seed`;

  console.log("Seeding inventory...");

  try {
    const response = await fetch(seedUrl, {
      method: "POST",
      headers: {
        "x-session-id": "benchmark",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to seed inventory: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { products?: unknown[] };
    console.log(`Inventory seeded: ${result.products?.length || 0} products available`);
  } catch (error) {
    console.warn(`Could not seed inventory: ${error}`);
    console.log("Continuing with existing inventory...");
  }
  console.log("");
}

async function runBenchmark(config: BenchmarkConfig): Promise<void> {
  console.log("Starting benchmark...");
  await seedInventory(config.baseUrl);
  console.log(`Creating ${config.totalOrders} orders with concurrency ${config.concurrency}`);
  console.log("");

  metrics.startTime = Date.now();

  const orderNumbers = Array.from({ length: config.totalOrders }, (_, i) => i + 1);
  const results: ProcessOrderResult[] = [];

  // Process orders in batches based on concurrency
  for (let i = 0; i < orderNumbers.length; i += config.concurrency) {
    const batch = orderNumbers.slice(i, i + config.concurrency);
    const batchPromises = batch.map((orderNum) => processSingleOrder(config, orderNum));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress indicator
    process.stdout.write(`\rProgress: ${results.length}/${config.totalOrders} orders processed`);
  }

  metrics.endTime = Date.now();
  console.log("\n");

  printStats(config);
}

(async () => {
  try {
    const config = parseArgs();
    await runBenchmark(config);
    process.exit(0);
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
})();
