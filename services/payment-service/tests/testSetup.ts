/**
 * Test setup for payment service integration tests
 * Re-exports shared test utilities with a consistent TEST_SESSION_ID
 */

import * as testUtils from "@swap/shared/testUtils";
import { PaymentStatus } from "@swap/shared/constants";

// Test session ID for isolating test data
export const TEST_SESSION_ID = "test-session-payment-12345";

// Re-export service URLs
export const ORDER_SERVICE_URL = testUtils.ORDER_SERVICE_URL;
export const INVENTORY_SERVICE_URL = testUtils.INVENTORY_SERVICE_URL;
export const PAYMENT_SERVICE_URL = testUtils.PAYMENT_SERVICE_URL;

// Re-export functions with the session ID pre-applied
export const checkServicesHealth = testUtils.checkServicesHealth;

export const resetAllServices = async () => {
  return testUtils.resetAllServices(TEST_SESSION_ID);
};

export const waitForPaymentStatus = async (
  orderId: string,
  expectedStatus: PaymentStatus,
  maxWaitMs: number = 10000,
): Promise<boolean> => {
  return testUtils.waitForPaymentStatus(TEST_SESSION_ID, orderId, expectedStatus, maxWaitMs);
};

export const getPaymentByOrderId = async (orderId: string) => {
  return testUtils.getPaymentByOrderId(TEST_SESSION_ID, orderId);
};
