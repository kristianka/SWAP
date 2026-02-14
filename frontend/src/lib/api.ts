import type { Order, InventoryItem, Payment } from "@swap/shared";

const API_BASE_URLS = {
  orders: import.meta.env.VITE_ORDER_SERVICE_URL || "http://localhost:3001",
  inventory: import.meta.env.VITE_INVENTORY_SERVICE_URL || "http://localhost:3002",
  payments: import.meta.env.VITE_PAYMENT_SERVICE_URL || "http://localhost:3003",
} as const;

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

// Session management
const SESSION_KEY = "swap-demo-session-id";
const SESSION_SEEDED_KEY = "swap-demo-session-seeded";

// Auto-seed inventory for new sessions
const autoSeedInventory = async (sessionId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URLS.inventory}/inventory/seed`, {
      method: "POST",
      headers: {
        "x-session-id": sessionId,
      },
    });
    if (response.ok) {
      console.log("Inventory automatically seeded for session:", sessionId);
      localStorage.setItem(SESSION_SEEDED_KEY, sessionId);
    } else {
      console.error("Failed to auto-seed inventory:", response.statusText);
    }
  } catch (error) {
    console.error("Failed to auto-seed inventory:", error);
  }
};

export const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  const seededSessionId = localStorage.getItem(SESSION_SEEDED_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    // Auto-seed for new session
    autoSeedInventory(sessionId);
  } else if (sessionId !== seededSessionId) {
    // Session exists but hasn't been seeded yet
    autoSeedInventory(sessionId);
  }

  return sessionId;
};

export const regenerateSessionId = async (): Promise<string> => {
  const sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, sessionId);
  // Clear seeded flag to trigger auto-seed
  localStorage.removeItem(SESSION_SEEDED_KEY);
  // Auto-seed the new session
  await autoSeedInventory(sessionId);
  return sessionId;
};

// Helper to get headers with session ID
const getHeaders = (additionalHeaders?: Record<string, string>) => {
  return {
    "x-session-id": getOrCreateSessionId(),
    ...additionalHeaders,
  };
};

export const api = {
  async fetchOrders(): Promise<ApiResponse<Order[]>> {
    try {
      const res = await fetch(`${API_BASE_URLS.orders}/orders`, {
        headers: getHeaders(),
      });
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
      const res = await fetch(`${API_BASE_URLS.inventory}/inventory`, {
        headers: getHeaders(),
      });
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
      const res = await fetch(`${API_BASE_URLS.payments}/payments`, {
        headers: getHeaders(),
      });
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

  async createOrder(
    items: { product: string; quantity: number }[],
    paymentBehaviour?: "success" | "failure" | "random",
    inventoryBehaviour?: "success" | "failure" | "random",
  ): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URLS.orders}/orders`, {
        method: "POST",
        headers: getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ items, paymentBehaviour, inventoryBehaviour }),
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
