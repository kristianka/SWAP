/**
 * Test setup for inventory service integration tests
 * Re-exports shared test utilities with a consistent TEST_SESSION_ID
 */

import * as testUtils from "@swap/shared/testUtils";

// Test session ID for isolating test data
export const TEST_SESSION_ID = "test-session-inventory-12345";

// Re-export service URLs
export const ORDER_SERVICE_URL = testUtils.ORDER_SERVICE_URL;
export const INVENTORY_SERVICE_URL = testUtils.INVENTORY_SERVICE_URL;
export const PAYMENT_SERVICE_URL = testUtils.PAYMENT_SERVICE_URL;

// Re-export functions with the session ID pre-applied
export const checkServicesHealth = testUtils.checkServicesHealth;

export const resetAllServices = async () => {
  return testUtils.resetAllServices(TEST_SESSION_ID);
};

export const seedInventory = async () => {
  return testUtils.seedInventory(TEST_SESSION_ID);
};

export const getInventory = async () => {
  return testUtils.getInventory(TEST_SESSION_ID);
};

export const getInventoryStats = async () => {
  return testUtils.getInventoryStats(TEST_SESSION_ID);
};

export const getProduct = async (productId: string) => {
  return testUtils.getProduct(TEST_SESSION_ID, productId);
};
