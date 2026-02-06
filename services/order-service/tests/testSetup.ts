/**
 * Shared test utilities and setup for integration tests
 */

export const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3001";
export const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3002";
export const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3003";

/**
 * Verify all services are running
 */
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
 * - Clears idempotency records
 */
export const resetAllServices = async () => {
  // Reset in order: orders first, then inventory (to avoid FK issues if any)
  await fetch(`${ORDER_SERVICE_URL}/orders/reset`, { method: "POST" });
  await fetch(`${INVENTORY_SERVICE_URL}/inventory/reset`, { method: "POST" });

  // Small delay to ensure queues are drained
  await new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * Seed inventory with initial test data
 */
export const seedInventory = async () => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/seed`, { method: "POST" });
  return response.json();
};
