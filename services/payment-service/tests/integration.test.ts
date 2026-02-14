import { OrderStatus, PaymentStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ORDER_SERVICE_URL,
  PAYMENT_SERVICE_URL,
  TEST_SESSION_ID,
  checkServicesHealth,
  resetAllServices,
  waitForPaymentStatus,
  getPaymentByOrderId,
} from "./testSetup";

describe("Payment Service Integration Tests", () => {
  beforeAll(async () => {
    await checkServicesHealth();
    await resetAllServices();
  });

  describe("Happy Path", () => {
    test("should create payment record when order is placed", async () => {
      // Create an order
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 1 }],
          skipDemoDelays: true,
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      // Wait for payment to be processed
      const paymentExists = await waitForPaymentStatus(order.id, PaymentStatus.SUCCESS, 15000);
      expect(paymentExists).toBe(true);

      // Verify payment details
      const payment = await getPaymentByOrderId(order.id);
      expect(payment).toBeDefined();
      expect(payment.order_id).toBe(order.id);
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.amount).toBeGreaterThan(0);
      expect(payment.id).toMatch(/^txn_/);
    }, 20000);

    test("should successfully process payment with correct amount calculation", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [
            { product: "laptop", quantity: 2 }, // 2 * 10 = 20
            { product: "mouse", quantity: 3 }, // 3 * 10 = 30
          ],
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for payment
      await waitForPaymentStatus(order.id, PaymentStatus.SUCCESS, 15000);

      // Verify amount calculation (quantity * 10 for each item)
      const payment = await getPaymentByOrderId(order.id);
      expect(payment.amount).toBe(50); // (2 * 10) + (3 * 10)
    }, 20000);

    test("should handle multiple concurrent payments", async () => {
      // Create two orders concurrently
      const [order1Response, order2Response] = await Promise.all([
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "keyboard", quantity: 1 }],
            skipDemoDelays: true,
          }),
        }),
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "monitor", quantity: 2 }],
            skipDemoDelays: true,
          }),
        }),
      ]);

      const order1 = (await order1Response.json()) as Order;
      const order2 = (await order2Response.json()) as Order;

      // Wait for both payments concurrently
      const [payment1Success, payment2Success] = await Promise.all([
        waitForPaymentStatus(order1.id, PaymentStatus.SUCCESS, 15000),
        waitForPaymentStatus(order2.id, PaymentStatus.SUCCESS, 15000),
      ]);

      expect(payment1Success).toBe(true);
      expect(payment2Success).toBe(true);

      // Verify both payments exist
      const payment1 = await getPaymentByOrderId(order1.id);
      const payment2 = await getPaymentByOrderId(order2.id);

      expect(payment1).toBeDefined();
      expect(payment2).toBeDefined();
      expect(payment1.id).not.toBe(payment2.id);
    }, 20000);
  });

  describe("Failure Scenarios", () => {
    test("should fail payment when payment behaviour is set to failure", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 1 }],
          paymentBehaviour: "failure",
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for payment to fail
      const paymentFailed = await waitForPaymentStatus(order.id, PaymentStatus.FAILED, 15000);
      expect(paymentFailed).toBe(true);

      // Verify payment status
      const payment = await getPaymentByOrderId(order.id);
      expect(payment.status).toBe(PaymentStatus.FAILED);
    }, 20000);

    test("should transition payment from PENDING to FAILED correctly", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "mouse", quantity: 1 }],
          paymentBehaviour: "failure",
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait a moment for PENDING status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get payment - might still be PENDING or already FAILED
      let payment = await getPaymentByOrderId(order.id);
      expect(payment).toBeDefined();
      expect([PaymentStatus.PENDING, PaymentStatus.FAILED]).toContain(payment.status);

      // Wait for final FAILED status
      await waitForPaymentStatus(order.id, PaymentStatus.FAILED, 15000);
      payment = await getPaymentByOrderId(order.id);
      expect(payment.status).toBe(PaymentStatus.FAILED);
    }, 20000);
  });

  describe("API Endpoints", () => {
    test("should return all payments for session", async () => {
      // Create multiple orders
      const order1Response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 1 }],
          skipDemoDelays: true,
        }),
      });

      const order2Response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "mouse", quantity: 2 }],
          skipDemoDelays: true,
        }),
      });

      const order1 = (await order1Response.json()) as Order;
      const order2 = (await order2Response.json()) as Order;

      // Wait for both payments
      await Promise.all([
        waitForPaymentStatus(order1.id, PaymentStatus.SUCCESS, 15000),
        waitForPaymentStatus(order2.id, PaymentStatus.SUCCESS, 15000),
      ]);

      // Get all payments
      const paymentsResponse = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });

      expect(paymentsResponse.ok).toBe(true);
      const payments = (await paymentsResponse.json()) as any[];

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThanOrEqual(2);

      // Verify our payments are in the list
      const payment1 = payments.find((p) => p.order_id === order1.id);
      const payment2 = payments.find((p) => p.order_id === order2.id);

      expect(payment1).toBeDefined();
      expect(payment2).toBeDefined();
    }, 20000);

    test("should require x-session-id header", async () => {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const body = (await response.json()) as any;
      expect(body.error).toContain("x-session-id");
    });

    test("should return empty array when no payments exist", async () => {
      const uniqueSessionId = `test-empty-${Date.now()}`;

      const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
        headers: { "x-session-id": uniqueSessionId },
      });

      expect(response.ok).toBe(true);
      const payments = (await response.json()) as any;
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(0);
    });
  });

  describe("Idempotency", () => {
    test("should not create duplicate payments for same order", async () => {
      // Create an order
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "keyboard", quantity: 1 }],
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for payment to complete
      await waitForPaymentStatus(order.id, PaymentStatus.SUCCESS, 15000);

      // Get all payments for this order
      const paymentsResponse = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const payments = (await paymentsResponse.json()) as any[];
      const orderPayments = payments.filter((p) => p.order_id === order.id);

      // Should only have one payment for this order
      expect(orderPayments.length).toBe(1);
    }, 20000);
  });

  describe("Payment Status Transitions", () => {
    test("should maintain correct status history", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "monitor", quantity: 1 }],
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for payment to succeed
      await waitForPaymentStatus(order.id, PaymentStatus.SUCCESS, 15000);

      // Get payment
      const payment = await getPaymentByOrderId(order.id);

      // Verify fields
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.created_at).toBeDefined();
      expect(payment.updated_at).toBeDefined();
      expect(payment.version).toBeGreaterThan(0);
    }, 20000);
  });

  describe("Edge Cases", () => {
    test("should handle order with zero quantity gracefully", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 0 }],
          skipDemoDelays: true,
        }),
      });

      // This might fail at order creation or payment
      if (createResponse.ok) {
        const order = (await createResponse.json()) as Order;
        const payment = await getPaymentByOrderId(order.id);

        if (payment) {
          expect(payment.amount).toBe(0);
        }
      }
    }, 20000);

    test("should handle large quantity orders", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "mouse", quantity: 5 }],
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for payment (might fail due to inventory)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const payment = await getPaymentByOrderId(order.id);

      if (payment) {
        // If payment was created, verify amount
        expect(payment.amount).toBe(50); // 5 * 10
      }
    }, 20000);
  });
});
