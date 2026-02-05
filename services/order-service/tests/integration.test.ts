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
    const order = await response.json();

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      return order.status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Order ${orderId} did not reach terminal status within ${maxWaitMs}ms`);
};

describe("Microservices Integration Tests", () => {
  beforeAll(async () => {
    // Check all services are running
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
      const order = await createResponse.json();

      expect(order).toHaveProperty("id");
      expect(order.status).toBe("PENDING");
      expect(order.items).toHaveLength(2);

      // Wait for order to complete
      const finalStatus = await waitForOrderStatus(order.id);

      expect(finalStatus).toBe("COMPLETED");

      // Verify final order state
      const finalResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`);
      const finalOrder = await finalResponse.json();

      expect(finalOrder.status).toBe("COMPLETED");
      expect(finalOrder.items).toEqual(order.items);
    }, 15000);

    test("should handle multiple concurrent orders", async () => {
      const orderPromises = [
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ product: "keyboard", quantity: 1 }],
          }),
        }),
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ product: "monitor", quantity: 2 }],
          }),
        }),
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ product: "webcam", quantity: 1 }],
          }),
        }),
      ];

      const responses = await Promise.all(orderPromises);
      const orders = await Promise.all(responses.map((r) => r.json()));

      // All orders should be created successfully
      orders.forEach((order) => {
        expect(order).toHaveProperty("id");
        expect(order.status).toBe("PENDING");
      });

      // Wait for all orders to complete (give each order up to 12 seconds)
      const statusPromises = orders.map((order) => waitForOrderStatus(order.id, 12000));
      const finalStatuses = await Promise.all(statusPromises);

      // All orders should complete successfully
      finalStatuses.forEach((status) => {
        expect(status).toBe("COMPLETED");
      });
    }, 20000);
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

      const order = await createResponse.json();
      const orderId = order.id;

      // Get order by ID
      const getResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
      expect(getResponse.ok).toBe(true);

      const retrievedOrder = await getResponse.json();
      expect(retrievedOrder.id).toBe(orderId);
      expect(retrievedOrder.items[0].product).toBe("test-product");
      expect(retrievedOrder.items[0].quantity).toBe(5);
    }, 15000);

    test("should return 404 for non-existent order", async () => {
      const response = await fetch(`${ORDER_SERVICE_URL}/orders/non-existent-id`);
      expect(response.status).toBe(404);
    });

    test("should list all orders", async () => {
      const response = await fetch(`${ORDER_SERVICE_URL}/orders`);
      expect(response.ok).toBe(true);

      const orders = await response.json();
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
    test("should transition through correct status states", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "test-status-flow", quantity: 1 }],
        }),
      });

      const order = await createResponse.json();
      const orderId = order.id;

      // Initial status should be PENDING
      expect(order.status).toBe("PENDING");

      // Wait a bit and check for PROCESSING status
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const processingResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
      const processingOrder = await processingResponse.json();

      // Should have moved past PENDING (either PROCESSING or COMPLETED)
      expect(processingOrder.status).not.toBe("PENDING");

      // Wait for final status
      const finalStatus = await waitForOrderStatus(orderId);
      expect(finalStatus).toBe("COMPLETED");
    }, 15000);
  });
});
