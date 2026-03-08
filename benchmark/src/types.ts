export interface BenchmarkConfig {
  baseUrl: string;
  totalOrders: number;
  concurrency: number;
  behaviour: "success" | "payment-failure" | "inventory-failure";
  skipDelays: boolean;
}

export interface HttpResponse {
  status: number;
  data: any;
}

export interface OrderData {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  behaviour: string;
  skipDemoDelays: boolean;
}

export interface CreateOrderResult {
  orderId: string;
  createLatency: number;
  startTime: number;
}

export interface WaitForCompletionResult {
  status: string;
  completionLatency: number;
}

export interface ProcessOrderResult {
  orderNum: number;
  orderId?: string;
  status?: string;
  createLatency?: number;
  completionLatency?: number;
  error?: string;
}

export interface Metrics {
  orderCreationLatencies: number[];
  sagaCompletionLatencies: number[];
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  timeoutOrders: number;
  errors: number;
  startTime: number | null;
  endTime: number | null;
}
