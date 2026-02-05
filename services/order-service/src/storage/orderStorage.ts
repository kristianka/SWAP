import type { Order } from "@swap/shared";
import type { OrderStatus } from "@swap/shared";

// In-memory storage, later in postgres
export const orders: Order[] = [];

export const addOrder = (order: Order): void => {
  orders.push(order);
};

export const getOrders = (): Order[] => {
  return orders;
};

export const getOrderById = (id: string): Order | undefined => {
  return orders.find((order) => order.id === id);
};

export const updateOrderStatus = (orderId: string, status: OrderStatus): boolean => {
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
    return true;
  }
  return false;
};
