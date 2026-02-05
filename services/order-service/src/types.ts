import type {
  OrderEventType,
  OrderStatus,
  InventoryEventType,
  PaymentEventType,
} from "./constants";

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

export interface OrderEvent {
  type: OrderEventType;
  data: Order;
}

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

export type OrderCreatedEvent = OrderEvent;
