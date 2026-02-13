import type { Order } from "@swap/shared";
import { PaymentStatus } from "@swap/shared";

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
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  version: number;
}

const API_BASE_URLS = {
  orders: "http://localhost:3001",
  inventory: "http://localhost:3002",
  payments: "http://localhost:3003",
} as const;

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export const api = {
  async fetchOrders(): Promise<ApiResponse<Order[]>> {
    try {
      const res = await fetch(`${API_BASE_URLS.orders}/orders`);
      if (res.ok) {
        return { data: await res.json(), error: null };
      }
      return { data: [], error: `Failed to fetch orders: ${res.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch orders";
      console.error("Failed to fetch orders:", error);
      return { data: [], error: message };
    }
  },

  async fetchInventory(): Promise<ApiResponse<InventoryItem[]>> {
    try {
      const res = await fetch(`${API_BASE_URLS.inventory}/inventory`);
      if (res.ok) {
        return { data: await res.json(), error: null };
      }
      return { data: [], error: `Failed to fetch inventory: ${res.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch inventory";
      console.error("Failed to fetch inventory:", error);
      return { data: [], error: message };
    }
  },

  async fetchPayments(): Promise<ApiResponse<Payment[]>> {
    try {
      const res = await fetch(`${API_BASE_URLS.payments}/payments`);
      if (res.ok) {
        return { data: await res.json(), error: null };
      }
      return { data: [], error: `Failed to fetch payments: ${res.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch payments";
      console.error("Failed to fetch payments:", error);
      return { data: [], error: message };
    }
  },

  async fetchAllData() {
    return Promise.all([this.fetchOrders(), this.fetchInventory(), this.fetchPayments()]);
  },

  async createOrder(items: { product: string; quantity: number }[]): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URLS.orders}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        return { data: await response.json(), error: null };
      }

      // Try to get error details from response body
      let errorMessage = `Failed to create order: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error || errorBody.message) {
          errorMessage = errorBody.error || errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors
      }

      return { data: {} as Order, error: errorMessage };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create order";
      console.error("Failed to create order:", error);
      return { data: {} as Order, error: message };
    }
  },
};
