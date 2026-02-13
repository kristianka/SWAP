import { OrderStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ORDER_SERVICE_URL,
  INVENTORY_SERVICE_URL,
  checkServicesHealth,
  resetAllServices,
  waitForOrderStatus,
} from "./testSetup";

describe("Inventory Integration Tests", () => {
  beforeAll(async () => {
    await checkServicesHealth();
    // Reset all services to clean state before running tests
    await resetAllServices();
  });

  describe("Inventory Reservation Flow", () => {
    test("should reserve inventory and complete order when stock is available", async () => {
      // Get initial inventory state
      const initialInventory = await fetch(`${INVENTORY_SERVICE_URL}/inventory`);
      const initialProducts = (await initialInventory.json()) as any[];
      const laptop = initialProducts.find((p) => p.id === "laptop");

      // Create an order for products that exist in inventory
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
      expect(order.status).toBe(OrderStatus.PENDING);

      // Wait for order to complete
      const finalStatus = await waitForOrderStatus(order.id, 15000);
      expect(finalStatus).toBe(OrderStatus.COMPLETED);

      // Verify inventory was deducted
      const finalInventory = await fetch(`${INVENTORY_SERVICE_URL}/inventory`);
      const finalProducts = (await finalInventory.json()) as any[];
      const finalLaptop = finalProducts.find((p) => p.id === "laptop");

      // Stock should be reduced by 1
      expect(finalLaptop.stock_level).toBe(laptop.stock_level - 1);
    }, 20000);

    test("should fail order when requesting more than available inventory", async () => {
      // Create an order for excessive quantity
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 999 }], // Way more than available :D
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;
      expect(order.status).toBe(OrderStatus.PENDING);

      // Wait for order to be cancelled due to insufficient inventory
      const finalStatus = await waitForOrderStatus(order.id, 15000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);
    }, 20000);

    test("should fail order when product does not exist", async () => {
      // Create an order for a non-existent product
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "nonexistent-product-xyz", quantity: 1 }],
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;
      expect(order.status).toBe(OrderStatus.PENDING);

      // Wait for order to be cancelled
      const finalStatus = await waitForOrderStatus(order.id, 15000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);
    }, 20000);

    test("should release inventory when payment fails", async () => {
      // Get initial inventory state
      const initialInventory = await fetch(`${INVENTORY_SERVICE_URL}/inventory`);
      const initialProducts = (await initialInventory.json()) as any[];
      const monitor = initialProducts.find((p) => p.id === "monitor");
      const initialStock = monitor?.stock_level ?? 0;

      // Create an order that will fail at payment (inventory will be reserved then released)
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product: "monitor", quantity: 1 }],
          paymentBehaviour: "failure",
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for order to be cancelled
      const finalStatus = await waitForOrderStatus(order.id, 20000);
      expect(finalStatus).toBe(OrderStatus.CANCELLED);

      // Wait a bit for compensation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify inventory was released (stock should be unchanged)
      const finalInventory = await fetch(`${INVENTORY_SERVICE_URL}/inventory`);
      const finalProducts = (await finalInventory.json()) as any[];
      const finalMonitor = finalProducts.find((p) => p.id === "monitor");

      // Stock level should be the same (reserved then released)
      expect(finalMonitor.stock_level).toBe(initialStock);
      expect(finalMonitor.reserved).toBe(monitor?.reserved ?? 0);
    }, 25000);
  });

  describe("Inventory Stats", () => {
    test("should return inventory statistics", async () => {
      const statsResponse = await fetch(`${INVENTORY_SERVICE_URL}/inventory/stats`);
      expect(statsResponse.ok).toBe(true);

      const stats = (await statsResponse.json()) as {
        products: { total_products: number; total_stock: number };
        reservations: unknown;
      };
      expect(stats).toHaveProperty("products");
      expect(stats).toHaveProperty("reservations");
      expect(stats.products).toHaveProperty("total_products");
      expect(stats.products).toHaveProperty("total_stock");
    });
  });

  describe("Seed Endpoint", () => {
    test("should seed inventory with default products", async () => {
      const seedResponse = await fetch(`${INVENTORY_SERVICE_URL}/inventory/seed`, {
        method: "POST",
      });

      expect(seedResponse.ok).toBe(true);
      const result = (await seedResponse.json()) as { message: string; products: unknown[] };
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("products");
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.products.length).toBeGreaterThan(0);
    });
  });
});
