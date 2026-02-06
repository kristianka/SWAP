import { OrderStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ORDER_SERVICE_URL,
  checkServicesHealth,
  resetAllServices,
  waitForOrderStatus,
} from "./testSetup";

describe("Microservices Integration Tests", () => {
  beforeAll(async () => {
    await checkServicesHealth();
    // Reset all services to clean state before running tests
    await resetAllServices();
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
      // Create two orders concurrently
      const [order1Response, order2Response] = await Promise.all([
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
      ]);

      const order1 = (await order1Response.json()) as Order;
      const order2 = (await order2Response.json()) as Order;

      expect(order1).toHaveProperty("id");
      expect(order1.status).toBe(OrderStatus.PENDING);
      expect(order2).toHaveProperty("id");
      expect(order2.status).toBe(OrderStatus.PENDING);

      // Wait for both orders to complete concurrently
      const [status1, status2] = await Promise.all([
        waitForOrderStatus(order1.id, 15000),
        waitForOrderStatus(order2.id, 15000),
      ]);

      expect(status1).toBe(OrderStatus.COMPLETED);
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
