// ===========================================
// Service Names
// ===========================================
export const ORDER_SERVICE = "order-service";
export const INVENTORY_SERVICE = "inventory-service";
export const PAYMENT_SERVICE = "payment-service";

// ===========================================
// Order Status (state machine for orders)
// ===========================================
export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ===========================================
// Event Types (contracts between services)
// ===========================================
export enum OrderEventType {
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_UPDATED = "ORDER_UPDATED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
}

export enum InventoryEventType {
  INVENTORY_RESERVED = "INVENTORY_RESERVED",
  INVENTORY_FAILED = "INVENTORY_FAILED",
  INVENTORY_RELEASED = "INVENTORY_RELEASED",
}

export enum PaymentEventType {
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum InventoryStatus {
  NO_RESERVATIONS = "NO_RESERVATIONS",
  RESERVING = "RESERVING",
  RESERVED = "RESERVED",
}

// ===========================================
// Test Behaviour (for simulating failures)
// ===========================================
export enum TestBehaviour {
  SUCCESS = "success",
  FAILURE = "failure",
  RANDOM = "random",
}

/**
 * Determines if a test behaviour should result in failure
 * @param behaviour The test behaviour to evaluate
 * @returns true if the operation should fail, false otherwise
 */
export function shouldFailForBehaviour(behaviour?: TestBehaviour | string): boolean {
  if (behaviour === TestBehaviour.FAILURE || behaviour === "failure") {
    return true;
  }
  if (behaviour === TestBehaviour.RANDOM || behaviour === "random") {
    return Math.random() < 0.5; // 50% chance to fail
  }
  return false;
}

// ===========================================
// Queue Names (message broker routing)
// ===========================================
export const QUEUES = {
  ORDER_EVENTS: "order-events",
  INVENTORY_EVENTS: "inventory-events",
  PAYMENT_EVENTS: "payment-events",
} as const;

// Legacy exports for backward compatibility
export const ORDER_EVENTS = QUEUES.ORDER_EVENTS;
export const INVENTORY_EVENTS = QUEUES.INVENTORY_EVENTS;
export const PAYMENT_EVENTS = QUEUES.PAYMENT_EVENTS;
