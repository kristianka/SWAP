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

export const ORDER_EVENTS = "order-events";
export const ORDER_SERVICE = "order-service";
