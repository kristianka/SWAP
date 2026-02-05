import type {
  OrderStatus,
  OrderEventType,
  InventoryEventType,
  PaymentEventType,
} from "./constants";

// ===========================================
// Domain Models
// ===========================================
export interface OrderItem {
  product: string;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
}

// ===========================================
// Event Payloads (what services exchange)
// ===========================================

// Order Service events
export interface OrderEvent {
  type: OrderEventType;
  data: Order;
}

export type OrderCreatedEvent = OrderEvent;

// Inventory Service events
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
    items: OrderItem[];
  };
}

export type InventoryEvent = InventoryReservedEvent | InventoryFailedEvent | InventoryReleasedEvent;

// Payment Service events
export interface PaymentSuccessEvent {
  type: PaymentEventType.PAYMENT_SUCCESS;
  data: {
    orderId: string;
    amount: number;
    transactionId: string;
  };
}

export interface PaymentFailedEvent {
  type: PaymentEventType.PAYMENT_FAILED;
  data: {
    orderId: string;
    reason: string;
  };
}

export type PaymentEvent = PaymentSuccessEvent | PaymentFailedEvent;
