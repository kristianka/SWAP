import type { BenchmarkConfig } from "./types.js";

export function parseArgs(): BenchmarkConfig {
  const args = process.argv.slice(2);

  const getArg = (name: string, defaultValue: string): string => {
    const index = args.indexOf(`--${name}`);
    return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
  };

  const baseUrl = getArg("url", process.env.ORDER_SERVICE_URL || "http://localhost:3001");
  const totalOrders = parseInt(getArg("orders", "10"));
  const concurrency = parseInt(getArg("concurrency", "1"));
  const behaviour = getArg("behaviour", "success") as BenchmarkConfig["behaviour"];
  const skipDelays = args.includes("--skip-delays");

  return {
    baseUrl,
    totalOrders,
    concurrency,
    behaviour,
    skipDelays,
  };
}
