import type { Order } from "@swap/shared";

// Database-specific interfaces (not in shared types as they're storage implementation details)
export interface InventoryItem {
  id: string;
  name: string;
  stock_level: number;
  reserved: number;
  available: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  version: number;
}

const API_BASE_URLS = {
  orders: "http://localhost:3001",
  inventory: "http://localhost:3002",
  payments: "http://localhost:3003",
} as const;

export const api = {
  async fetchOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE_URLS.orders}/orders`);
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Failed to fetch orders: ${res.statusText}`);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      return [];
    }
  },

  async fetchInventory(): Promise<InventoryItem[]> {
    try {
      const res = await fetch(`${API_BASE_URLS.inventory}/inventory`);
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Failed to fetch inventory: ${res.statusText}`);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      return [];
    }
  },

  async fetchPayments(): Promise<Payment[]> {
    try {
      const res = await fetch(`${API_BASE_URLS.payments}/payments`);
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Failed to fetch payments: ${res.statusText}`);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      return [];
    }
  },

  async fetchAllData() {
    return Promise.all([this.fetchOrders(), this.fetchInventory(), this.fetchPayments()]);
  },
};
