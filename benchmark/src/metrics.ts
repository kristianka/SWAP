import type { BenchmarkConfig, Metrics } from "./types.js";

export const metrics: Metrics = {
  orderCreationLatencies: [],
  sagaCompletionLatencies: [],
  totalOrders: 0,
  completedOrders: 0,
  failedOrders: 0,
  cancelledOrders: 0,
  timeoutOrders: 0,
  errors: 0,
  startTime: null,
  endTime: null,
};

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function printStats(config: BenchmarkConfig): void {
  if (!metrics.startTime || !metrics.endTime) return;

  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const throughput = metrics.totalOrders / duration;

  console.log("\n" + "=".repeat(60));
  console.log("                    BENCHMARK RESULTS");
  console.log("=".repeat(60));
  console.log(`Configuration:`);
  console.log(`  URL:               ${config.baseUrl}`);
  console.log(`  Total Orders:      ${config.totalOrders}`);
  console.log(`  Concurrency:       ${config.concurrency}`);
  console.log(`  Behaviour:         ${config.behaviour}`);
  console.log(`  Skip Delays:       ${config.skipDelays}`);
  console.log("");
  console.log(`Results:`);
  console.log(`  Duration:          ${duration.toFixed(2)}s`);
  console.log(`  Throughput:        ${throughput.toFixed(2)} orders/sec`);
  console.log(`  Completed:         ${metrics.completedOrders}`);
  console.log(`  Cancelled:         ${metrics.cancelledOrders}`);
  console.log(`  Timeouts:          ${metrics.timeoutOrders}`);
  console.log(`  Errors:            ${metrics.errors}`);
  console.log("");

  if (metrics.orderCreationLatencies.length > 0) {
    console.log(`Order Creation Latency (HTTP POST):`);
    console.log(`  Min:               ${Math.min(...metrics.orderCreationLatencies)}ms`);
    console.log(`  p50:               ${percentile(metrics.orderCreationLatencies, 50)}ms`);
    console.log(`  p95:               ${percentile(metrics.orderCreationLatencies, 95)}ms`);
    console.log(`  p99:               ${percentile(metrics.orderCreationLatencies, 99)}ms`);
    console.log(`  Max:               ${Math.max(...metrics.orderCreationLatencies)}ms`);
    console.log("");
  }

  if (metrics.sagaCompletionLatencies.length > 0) {
    console.log(`End-to-End Saga Completion Latency:`);
    console.log(`  Min:               ${Math.min(...metrics.sagaCompletionLatencies)}ms`);
    console.log(`  p50:               ${percentile(metrics.sagaCompletionLatencies, 50)}ms`);
    console.log(`  p95:               ${percentile(metrics.sagaCompletionLatencies, 95)}ms`);
    console.log(`  p99:               ${percentile(metrics.sagaCompletionLatencies, 99)}ms`);
    console.log(`  Max:               ${Math.max(...metrics.sagaCompletionLatencies)}ms`);
  }
  console.log("=".repeat(60) + "\n");
}
