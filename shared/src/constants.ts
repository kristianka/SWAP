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
