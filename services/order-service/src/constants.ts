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

export const ORDER_EVENTS = "order-events";
export const INVENTORY_EVENTS = "inventory-events";
export const ORDER_SERVICE = "order-service";
