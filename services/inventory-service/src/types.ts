import type { InventoryEventType, OrderEventType, PaymentEventType } from "./constants";

// Many of these are same as in order service,
// but we keep them separate because microservices usually
// are independent and may evolve differently over time,
// and may even live in different repositories.

// incoming events
export interface OrderItem {
  product: string;
  quantity: number;
}

export interface OrderCreatedEvent {
  type: OrderEventType.ORDER_CREATED;
  data: {
    id: string;
    items: OrderItem[];
  };
}

export interface PaymentFailedEvent {
  type: PaymentEventType.PAYMENT_FAILED;
  data: {
    orderId: string;
  };
}

// outgoing events
export interface InventoryReservedEvent {
  type: InventoryEventType.INVENTORY_RESERVED;
  data: {
    orderId: string;
    items: OrderItem[];
  };
}

export interface InventoryFailedEvent {
  type: InventoryEventType.INVENTORY_FAILED;
  data: {
    orderId: string;
    reason: string;
  };
}

export interface InventoryReleasedEvent {
  type: InventoryEventType.INVENTORY_RELEASED;
  data: {
    orderId: string;
  };
}

// internal types
export interface StockItem {
  product: string;
  available: number;
  reserved: number;
}

export interface Reservation {
  orderId: string;
  items: OrderItem[];
}
