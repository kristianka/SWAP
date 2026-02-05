export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

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
  PAYMENT_REQUEST = "PAYMENT_REQUEST",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
}

export const ORDER_EVENTS = "order-events";
export const ORDER_SERVICE = "order-service";

export const INVENTORY_EVENTS = "inventory-events";
export const INVENTORY_SERVICE = "inventory-service";

export const PAYMENT_EVENTS = "payment-events";
export const PAYMENT_SERVICE = "payment-service";
export const PAYMENT_QUEUE = "payment-queue";
