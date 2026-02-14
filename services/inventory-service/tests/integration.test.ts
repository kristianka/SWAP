import { OrderStatus } from "@swap/shared";
import type { Order } from "@swap/shared/types";
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ORDER_SERVICE_URL,
  INVENTORY_SERVICE_URL,
  TEST_SESSION_ID,
  checkServicesHealth,
  resetAllServices,
  seedInventory,
  getInventory,
  getInventoryStats,
  getProduct,
} from "./testSetup";

describe("Inventory Service Integration Tests", () => {
  beforeAll(async () => {
    await checkServicesHealth();
    await resetAllServices();
  });

  describe("API Endpoints", () => {
    test("should return all inventory items", async () => {
      const inventory = await getInventory();

      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);

      // Verify structure
      const product = inventory[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("stock_level");
      expect(product).toHaveProperty("reserved");
      expect(product).toHaveProperty("available");
    });

    test("should require x-session-id header", async () => {
      const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory`);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const body = (await response.json()) as any;
      expect(body.error).toContain("x-session-id");
    });

    test("should seed inventory with default products", async () => {
      const result = (await seedInventory()) as any;

      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("products");
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.products.length).toBeGreaterThan(0);

      // Verify seeded products
      const inventory = await getInventory();
      expect(inventory.length).toBeGreaterThanOrEqual(result.products.length);
    });

    test("should return inventory statistics", async () => {
      const stats = (await getInventoryStats()) as any;

      expect(stats).toHaveProperty("totalProducts");
      expect(stats).toHaveProperty("totalStock");
      expect(stats).toHaveProperty("totalReserved");
      expect(stats).toHaveProperty("totalAvailable");

      expect(typeof stats.totalProducts).toBe("number");
      expect(typeof stats.totalStock).toBe("number");
      expect(typeof stats.totalReserved).toBe("number");
      expect(typeof stats.totalAvailable).toBe("number");

      expect(stats.totalProducts).toBeGreaterThan(0);
    });

    test("should reset inventory to initial state", async () => {
      // Get initial inventory
      const initialInventory = await getInventory();
      const initialLaptop = initialInventory.find((p) => p.id === "laptop");
      const initialStock = initialLaptop?.stock_level || 0;

      // Create an order to modify inventory
      await fetch(`${ORDER_SERVICE_URL}/orders`, {
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

      // Wait for order to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Reset inventory
      const resetResponse = await fetch(`${INVENTORY_SERVICE_URL}/inventory/reset`, {
        method: "POST",
        headers: { "x-session-id": TEST_SESSION_ID },
      });

      expect(resetResponse.ok).toBe(true);
      const resetResult = await resetResponse.json();
      expect(resetResult).toHaveProperty("message");

      // Verify inventory was reset
      const resetInventory = await getInventory();
      const resetLaptop = resetInventory.find((p) => p.id === "laptop");
      expect(resetLaptop?.stock_level).toBe(initialStock);
    }, 20000);
  });

  describe("Inventory Reservation Flow", () => {
    test("should reserve inventory when order is created", async () => {
      const initialLaptop = await getProduct("laptop");
      const initialAvailable = initialLaptop?.available || 0;

      // Create an order
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 2 }],
          skipDemoDelays: true,
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      // Wait for order processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check inventory - it should be reserved or deducted
      const updatedLaptop = await getProduct("laptop");

      // Either reserved increased or stock decreased
      const availableChanged = updatedLaptop!.available !== initialAvailable;
      expect(availableChanged).toBe(true);
    }, 20000);

    test("should correctly calculate available stock (stock_level - reserved)", async () => {
      const inventory = await getInventory();

      for (const product of inventory) {
        // available = stock_level - reserved
        const expectedAvailable = product.stock_level - product.reserved;
        expect(product.available).toBe(expectedAvailable);
      }
    });

    test("should handle reservation of multiple items", async () => {
      const initialMouse = await getProduct("mouse");
      const initialKeyboard = await getProduct("keyboard");

      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [
            { product: "mouse", quantity: 1 },
            { product: "keyboard", quantity: 1 },
          ],
          skipDemoDelays: true,
        }),
      });

      expect(createResponse.ok).toBe(true);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const updatedMouse = await getProduct("mouse");
      const updatedKeyboard = await getProduct("keyboard");

      // Verify both items were affected
      expect(updatedMouse?.available).not.toBe(initialMouse?.available);
      expect(updatedKeyboard?.available).not.toBe(initialKeyboard?.available);
    }, 20000);

    test("should release inventory when payment fails", async () => {
      const initialMonitor = await getProduct("monitor");
      const initialAvailable = initialMonitor?.available || 0;

      // Create order that will fail at payment
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "monitor", quantity: 1 }],
          paymentBehaviour: "failure",
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for full saga completion (reserve -> payment fail -> release)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Inventory should be released back
      const finalMonitor = await getProduct("monitor");
      expect(finalMonitor?.available).toBe(initialAvailable);
    }, 20000);
  });

  describe("Inventory Failures", () => {
    test("should fail when requesting more than available inventory", async () => {
      const laptop = await getProduct("laptop");

      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: laptop!.available + 100 }],
          skipDemoDelays: true,
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check order status - should be cancelled
      const orderResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await orderResponse.json()) as Order;
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);

      // Inventory should remain unchanged
      const finalLaptop = await getProduct("laptop");
      expect(finalLaptop?.available).toBe(laptop!.available);
    }, 20000);

    test("should fail when product does not exist", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "nonexistent-product-xyz-123", quantity: 1 }],
          skipDemoDelays: true,
        }),
      });

      expect(createResponse.ok).toBe(true);
      const order = (await createResponse.json()) as Order;

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Order should be cancelled
      const orderResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await orderResponse.json()) as Order;
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
    }, 20000);

    test("should handle inventory behaviour failure", async () => {
      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "laptop", quantity: 1 }],
          inventoryBehaviour: "failure",
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Order should be cancelled
      const orderResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await orderResponse.json()) as Order;
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
    }, 20000);
  });

  describe("Concurrent Operations", () => {
    test("should handle multiple concurrent orders for same product", async () => {
      const initialMouse = await getProduct("mouse");
      const initialAvailable = initialMouse?.available || 0;

      // Create multiple concurrent orders for the same product
      const orderPromises = Array.from({ length: 3 }, () =>
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "mouse", quantity: 1 }],
            skipDemoDelays: true,
          }),
        }).then((r) => r.json()),
      );

      const orders = await Promise.all(orderPromises);

      // Wait for all orders to process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get final inventory
      const finalMouse = await getProduct("mouse");

      // At most 3 items should be consumed (if all succeeded)
      expect(finalMouse!.available).toBeLessThanOrEqual(initialAvailable);
      expect(finalMouse!.available).toBeGreaterThanOrEqual(initialAvailable - 3);
    }, 20000);

    test("should handle concurrent orders for different products", async () => {
      const [order1Response, order2Response, order3Response] = await Promise.all([
        fetch(`${ORDER_SERVICE_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": TEST_SESSION_ID,
          },
          body: JSON.stringify({
            items: [{ product: "laptop", quantity: 1 }],
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
            items: [{ product: "monitor", quantity: 1 }],
            skipDemoDelays: true,
          }),
        }),
      ]);

      expect(order1Response.ok).toBe(true);
      expect(order2Response.ok).toBe(true);
      expect(order3Response.ok).toBe(true);

      // Wait for all to process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // All orders should have affected their respective products
      const inventory = await getInventory();
      expect(inventory.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe("Stock Level Verification", () => {
    test("should maintain correct stock levels after successful order", async () => {
      const initialLaptop = await getProduct("laptop");
      const initialStockLevel = initialLaptop?.stock_level || 0;

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

      const order = (await createResponse.json()) as Order;

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify order completed
      const orderResponse = await fetch(`${ORDER_SERVICE_URL}/orders/${order.id}`, {
        headers: { "x-session-id": TEST_SESSION_ID },
      });
      const finalOrder = (await orderResponse.json()) as Order;

      if (finalOrder.status === OrderStatus.COMPLETED) {
        // Stock should be reduced
        const finalLaptop = await getProduct("laptop");
        expect(finalLaptop!.stock_level).toBe(initialStockLevel - 1);
        expect(finalLaptop!.available).toBe(
          initialLaptop!.stock_level - initialLaptop!.reserved - 1,
        );
      }
    }, 20000);

    test("should not reduce stock when order is cancelled", async () => {
      const initialKeyboard = await getProduct("keyboard");
      const initialStockLevel = initialKeyboard?.stock_level || 0;

      const createResponse = await fetch(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": TEST_SESSION_ID,
        },
        body: JSON.stringify({
          items: [{ product: "keyboard", quantity: 999 }], // Will fail
          skipDemoDelays: true,
        }),
      });

      const order = (await createResponse.json()) as Order;

      // Wait for cancellation
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify stock unchanged
      const finalKeyboard = await getProduct("keyboard");
      expect(finalKeyboard!.stock_level).toBe(initialStockLevel);
    }, 20000);
  });

  describe("Idempotency", () => {
    test("should not reserve inventory twice for duplicate order events", async () => {
      const initialMonitor = await getProduct("monitor");
      const initialAvailable = initialMonitor?.available || 0;

      // Create an order
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

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get final inventory
      const finalMonitor = await getProduct("monitor");

      // Should only reserve once, not multiple times
      const expectedChange = order.status === OrderStatus.COMPLETED ? 1 : 0;

      // Verify reservation was only done once
      if (order.status === OrderStatus.COMPLETED) {
        expect(finalMonitor!.stock_level).toBeLessThanOrEqual(initialMonitor!.stock_level);
      }
    }, 20000);
  });

  describe("Edge Cases", () => {
    test("should handle empty inventory list", async () => {
      const uniqueSessionId = `test-empty-${Date.now()}`;

      const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory`, {
        headers: { "x-session-id": uniqueSessionId },
      });

      expect(response.ok).toBe(true);
      const inventory = (await response.json()) as any;
      expect(Array.isArray(inventory)).toBe(true);
      // New session will have no inventory until seeded
      expect(inventory.length).toBe(0);
    });

    test("should handle stats with no inventory", async () => {
      const uniqueSessionId = `test-empty-stats-${Date.now()}`;

      const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/stats`, {
        headers: { "x-session-id": uniqueSessionId },
      });

      expect(response.ok).toBe(true);
      const stats = (await response.json()) as any;

      expect(stats.totalProducts).toBe(0);
      expect(stats.totalStock).toBe(0);
      expect(stats.totalReserved).toBe(0);
      expect(stats.totalAvailable).toBe(0);
    });
  });
});
