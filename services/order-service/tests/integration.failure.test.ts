import { OrderStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ORDER_SERVICE_URL,
  TEST_SESSION_ID,
  checkServicesHealth,
  resetAllServices,
  waitForOrderStatus,
} from "./testSetup";

describe("Microservices Integration Tests - Failure Scenarios", () => {
  beforeAll(async () => {
    await checkServicesHealth();
    // Reset all services to clean state before running tests
    await resetAllServices();
  });

  describe("Failure Path", () => {
    test("should cancel order when payment fails", async () => {
      // Create order with paymentBehaviour set to failure
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [
            { product: "laptop", quantity: 1 },
            { product: "mouse", quantity: 2 },
          ],
          paymentBehaviour: "failure",
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      expect(order).toHaveProperty("id");
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toHaveLength(2);

      // Wait for order to be cancelled
      const finalStatus = await waitForOrderStatus(order.id, 15000);

      expect(finalStatus).toBe(OrderStatus.CANCELLED);

      // Verify final order state
      const finalResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await finalResponse.json()) as Order;

      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
      expect(finalOrder.items).toEqual(order.items);
    }, 20000);

    test("should handle payment failure with single item", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "keyboard", quantity: 1 }],
          paymentBehaviour: "failure",
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      expect(order.status).toBe(OrderStatus.PENDING);

      // Wait for cancellation
      const finalStatus = await waitForOrderStatus(order.id, 15000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);
    }, 20000);

    test("should handle multiple concurrent failed orders", async () => {
      // Create two orders that will fail (in parallel)
      const [order1Response, order2Response] = await Promise.all([
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "monitor", quantity: 1 }],
            paymentBehaviour: "failure",
          }),
        }),
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "keyboard", quantity: 2 }],
            paymentBehaviour: "failure",
          }),
        }),
      ]);

      const order1 = (await order1Response.json()) as Order;
      const order2 = (await order2Response.json()) as Order;

      expect(order1).toHaveProperty("id");
      expect(order1.status).toBe(OrderStatus.PENDING);
      expect(order2).toHaveProperty("id");
      expect(order2.status).toBe(OrderStatus.PENDING);

      // Wait for both orders to be cancelled concurrently
      const [status1, status2] = await Promise.all([
        waitForOrderStatus(order1.id, 15000),
        waitForOrderStatus(order2.id, 15000),
      ]);

      expect(status1).toBe(OrderStatus.CANCELLED);
      expect(status2).toBe(OrderStatus.CANCELLED);
    }, 35000);

    test("should transition from PENDING to CANCELLED on payment failure", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "test-failure-flow", quantity: 1 }],
          paymentBehaviour: "failure",
        }),
      });

      const order = (await createResponse.json()) as Order;
      const orderId = order.id;

      // Initial status should be PENDING
      expect(order.status).toBe(OrderStatus.PENDING);

      const finalStatus = await waitForOrderStatus(orderId, 15000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);

      // Verify order went directly from PENDING to CANCELLED
      const finalResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await finalResponse.json()) as Order;
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
    }, 20000);

    test("should handle large quantity order failure", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [
            { product: "expensive-item", quantity: 100 },
            { product: "another-item", quantity: 50 },
          ],
          paymentBehaviour: "failure",
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      expect(order.status).toBe(OrderStatus.PENDING);

      // Wait for cancellation
      const finalStatus = await waitForOrderStatus(order.id, 15000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);
    }, 20000);
  });

  describe("Mixed Scenarios", () => {
    test("should handle successful order followed by failed order", async () => {
      // First, create a successful order
      const successResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "mouse", quantity: 1 }],
        }),
      });

      const successOrder = (await successResponse.json()) as Order;
      expect(successOrder.status).toBe(OrderStatus.PENDING);

      const successStatus = await waitForOrderStatus(successOrder.id, 15000);
      expect(successStatus).toBe(OrderStatus.COMPLETED);

      // Now create a failed order
      const failResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "fail-item", quantity: 1 }],
          paymentBehaviour: "failure",
        }),
      });

      const failOrder = (await failResponse.json()) as Order;
      expect(failOrder.status).toBe(OrderStatus.PENDING);

      const failStatus = await waitForOrderStatus(failOrder.id, 15000);
      expect(failStatus).toBe(OrderStatus.CANCELLED);
    }, 35000);
  });
});
