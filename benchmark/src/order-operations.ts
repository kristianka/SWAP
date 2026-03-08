import type {
  BenchmarkConfig,
  CreateOrderResult,
  OrderData,
  ProcessOrderResult,
  WaitForCompletionResult,
} from "./types.js";
import { request } from "./http-client.js";
import { metrics } from "./metrics.js";

export async function createOrder(
  baseUrl: string,
  orderNum: number,
  behaviour: string,
  skipDelays: boolean,
): Promise<CreateOrderResult> {
  const orderData: OrderData = {
    userId: `bench-user-${orderNum}`,
    items: [{ productId: "item1", quantity: 1 }],
    behaviour: behaviour,
    skipDemoDelays: skipDelays,
  };

  const startCreate = Date.now();
  const response = await request(baseUrl, "POST", "/orders", orderData);
  const createLatency = Date.now() - startCreate;

  metrics.orderCreationLatencies.push(createLatency);

  if (response.status !== 200) {
    throw new Error(`Failed to create order: ${response.status} ${JSON.stringify(response.data)}`);
  }

  return { orderId: response.data.id, createLatency, startTime: startCreate };
}

export async function waitForCompletion(
  baseUrl: string,
  orderId: string,
  startTime: number,
  maxWaitMs: number = 30000,
): Promise<WaitForCompletionResult> {
  const pollInterval = 100; // 100ms
  const maxAttempts = Math.floor(maxWaitMs / pollInterval);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await request(baseUrl, "GET", `/orders/${orderId}`);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch order: ${response.status}`);
    }

    const order = response.data;
    const status = order.status;

    if (status === "COMPLETED" || status === "CANCELLED") {
      const completionLatency = Date.now() - startTime;
      return { status, completionLatency };
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout
  return { status: "TIMEOUT", completionLatency: maxWaitMs };
}

export async function processSingleOrder(
  config: BenchmarkConfig,
  orderNum: number,
): Promise<ProcessOrderResult> {
  try {
    // Create order
    const { orderId, createLatency, startTime } = await createOrder(
      config.baseUrl,
      orderNum,
      config.behaviour,
      config.skipDelays,
    );

    // Wait for completion
    const { status, completionLatency } = await waitForCompletion(
      config.baseUrl,
      orderId,
      startTime,
    );

    // Record metrics
    metrics.totalOrders++;
    metrics.sagaCompletionLatencies.push(completionLatency);

    if (status === "COMPLETED") {
      metrics.completedOrders++;
    } else if (status === "CANCELLED") {
      metrics.cancelledOrders++;
    } else if (status === "TIMEOUT") {
      metrics.timeoutOrders++;
    } else {
      metrics.failedOrders++;
    }

    return {
      orderNum,
      orderId,
      status,
      createLatency,
      completionLatency,
    };
  } catch (error) {
    metrics.errors++;
    return {
      orderNum,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
