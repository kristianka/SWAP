import type { Order } from "../types";

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
