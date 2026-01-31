import type { OrderEventType, OrderStatus } from "./constants";

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
