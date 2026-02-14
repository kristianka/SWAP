/**
 * Shared test utilities for integration tests across all services
 */

import { OrderStatus, PaymentStatus } from "./constants";
import type { InventoryItem, Order, Payment } from "./types";

// Service URLs
export const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3001";
export const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3002";
export const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3003";

export const checkServicesHealth = async () => {
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
};

/**
 * Reset all services to a clean state for testing
 * - Clears orders
 * - Resets inventory to initial stock levels
 * - Clears payments
 * - Clears idempotency records
 */
export const resetAllServices = async (sessionId: string) => {
  await fetch(`${ORDER_SERVICE_URL}/orders/reset`, {
    method: "POST",
    headers: { "x-session-id": sessionId },
  });
  await fetch(`${INVENTORY_SERVICE_URL}/inventory/reset`, {
    method: "POST",
    headers: { "x-session-id": sessionId },
  });
  await fetch(`${PAYMENT_SERVICE_URL}/payments/reset`, {
    method: "POST",
    headers: { "x-session-id": sessionId },
  });

  // Small delay to ensure queues are drained
  await new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * Seed inventory with initial test data
 */
export const seedInventory = async (sessionId: string) => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/seed`, {
    method: "POST",
    headers: { "x-session-id": sessionId },
  });
  return response.json();
};

export const waitForOrderStatus = async (
  sessionId: string,
  orderId: string,
  maxWaitMs: number = 10000,
) => {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`, {
      headers: { "x-session-id": sessionId },
    });
    const order = (await response.json()) as Order;

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)) {
      return order.status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Order ${orderId} did not reach terminal status within ${maxWaitMs}ms`);
};

export const waitForPaymentStatus = async (
  sessionId: string,
  orderId: string,
  expectedStatus: PaymentStatus,
  maxWaitMs: number = 10000,
): Promise<boolean> => {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
      headers: { "x-session-id": sessionId },
    });
    const payments = (await response.json()) as Payment[];
    const payment = payments.find((p) => p.order_id === orderId);

    if (payment && payment.status === expectedStatus) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
};

export const getPaymentByOrderId = async (sessionId: string, orderId: string) => {
  const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
    headers: { "x-session-id": sessionId },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payments: ${response.statusText}`);
  }

  const payments = (await response.json()) as Payment[];
  const payment = payments.find((p) => p.order_id === orderId);

  if (!payment) {
    throw new Error(`Payment for order ID ${orderId} not found`);
  }

  return payment;
};

export const getInventory = async (sessionId: string) => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory`, {
    headers: { "x-session-id": sessionId },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: ${response.statusText}`);
  }

  return (await response.json()) as InventoryItem[];
};

export const getInventoryStats = async (sessionId: string) => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/stats`, {
    headers: { "x-session-id": sessionId },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inventory stats: ${response.statusText}`);
  }

  return await response.json();
};

export const getProduct = async (sessionId: string, productId: string) => {
  const inventory = await getInventory(sessionId);
  if (!inventory || inventory.length === 0) {
    throw new Error("Inventory is empty");
  }

  const product = inventory.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  return product;
};
