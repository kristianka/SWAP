import { OrderStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3001";
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3002";
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3003";

// Helper to wait for order to reach a terminal status
const waitForOrderStatus = async (orderId: string, maxWaitMs: number = 10000) => {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
    const order = (await response.json()) as Order;

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      return order.status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Order ${orderId} did not reach terminal status within ${maxWaitMs}ms`);
};

describe("Microservices Integration Tests", () => {
  // healthcheck
  beforeAll(async () => {
    const services = [
      { name: "Order Service", url: `${ORDER_SERVICE_URL}/health` },
      { name: "Inventory Service", url: `${INVENTORY_SERVICE_URL}/health` },
      { name: "Payment Service", url: `${PAYMENT_SERVICE_URL}/health` },
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url);

        if (!response.ok) {
          throw new Error(`${service.name} health check failed`);
        }
      } catch (error) {
        throw new Error(
          `${service.name} is not running. Please start all services before running tests.`,
        );
      }
    }
  });

  describe("Happy Path", () => {
    test("should complete an order successfully", async () => {
      // Create order
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { product: "laptop", quantity: 1 },
            { product: "mouse", quantity: 2 },
          ],
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      expect(order).toHaveProperty("id");
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toHaveLength(2);

      // Wait for order to complete
      const finalStatus = await waitForOrderStatus(order.id);

      expect(finalStatus).toBe(OrderStatus.COMPLETED);

      // Verify final order state
      const finalResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`);
      const finalOrder = (await finalResponse.json()) as Order;

      expect(finalOrder.status).toBe(OrderStatus.COMPLETED);
      expect(finalOrder.items).toEqual(order.items);
    }, 15000);

    test("should handle multiple concurrent orders", async () => {
      // Test with just 2 orders to avoid overwhelming the services
      const order1Response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "keyboard", quantity: 1 }],
        }),
      });

      const order1 = (await order1Response.json()) as Order;
      expect(order1).toHaveProperty("id");
      expect(order1.status).toBe(OrderStatus.PENDING);

      // Wait for first order to complete before creating second
      const status1 = await waitForOrderStatus(order1.id, 15000);
      expect(status1).toBe(OrderStatus.COMPLETED);

      const order2Response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "monitor", quantity: 2 }],
        }),
      });

      const order2 = (await order2Response.json()) as Order;
      expect(order2).toHaveProperty("id");
      expect(order2.status).toBe(OrderStatus.PENDING);

      const status2 = await waitForOrderStatus(order2.id, 15000);
      expect(status2).toBe(OrderStatus.COMPLETED);
    }, 35000);
  });

  describe("API Endpoints", () => {
    test("should create and retrieve order by ID", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "test-product", quantity: 5 }],
        }),
      });

      const order = (await createResponse.json()) as Order;
      const orderId = order.id;

      // Get order by ID
      const getResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
      expect(getResponse.ok).toBe(true);

      const retrievedOrder = (await getResponse.json()) as Order;
      expect(retrievedOrder.id).toBe(orderId);
      expect(retrievedOrder.items[0]!.product).toBe("test-product");
      expect(retrievedOrder.items[0]!.quantity).toBe(5);
    }, 15000);

    test("should return 404 for non-existent order", async () => {
      const response = await fetch(`${ORDER_SERVICE_URL}/orders/non-existent-id`);
      expect(response.status).toBe(404);
    });

    test("should list all orders", async () => {
      const response = await fetch(`${ORDER_SERVICE_URL}/orders`);
      expect(response.ok).toBe(true);

      const orders = (await response.json()) as Order[];
      expect(Array.isArray(orders)).toBe(true);
    });

    test("should reject order with empty items", async () => {
      const response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Event Flow", () => {
    test("should transition from PENDING to COMPLETED (choreography pattern)", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "test-status-flow", quantity: 1 }],
        }),
      });

      const order = (await createResponse.json()) as Order;
      const orderId = order.id;

      // Initial status should be PENDING
      expect(order.status).toBe(OrderStatus.PENDING);

      const finalStatus = await waitForOrderStatus(orderId, 15000);
      expect(finalStatus).toBe(OrderStatus.COMPLETED);

      // Verify order went directly from PENDING to COMPLETED
      const finalResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
      const finalOrder = (await finalResponse.json()) as Order;
      expect(finalOrder.status).toBe(OrderStatus.COMPLETED);
    }, 20000);
  });
});
