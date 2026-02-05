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

// Incoming payment request from order service
export interface PaymentRequestEvent {
  type: PaymentEventType.PAYMENT_REQUEST;
  data: {
    orderId: string;
    items: OrderItem[];
  };
}

// Outgoing events to order service
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
