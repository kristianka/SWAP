export enum InventoryEventType {
  INVENTORY_RESERVED = "INVENTORY_RESERVED",
  INVENTORY_FAILED = "INVENTORY_FAILED",
  INVENTORY_RELEASED = "INVENTORY_RELEASED",
}

export enum OrderEventType {
  ORDER_CREATED = "ORDER_CREATED",
}

export enum PaymentEventType {
  PAYMENT_FAILED = "PAYMENT_FAILED",
}

// Queues
export const ORDER_EVENTS = "order-events";
export const INVENTORY_EVENTS = "inventory-events";
export const PAYMENT_EVENTS = "payment-events";
export const ORDER_SERVICE = "Order Service";
export const INVENTORY_SERVICE = "Inventory Service";
