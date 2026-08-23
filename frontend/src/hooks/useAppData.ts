import { useCallback, useEffect, useRef, useState } from "react";
import { type Order, type InventoryItem, type Payment } from "@swap/shared";
import { api } from "../lib/api";

const REFRESH_INTERVAL_MS = 10000;
const SUCCESS_MESSAGE_DURATION_MS = 5000;

interface Messages {
  success: string | null;
  error: string | null;
}

export type InventoryStatus = "loading" | "ready" | "error";

export const useAppData = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>("loading");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [messages, setMessages] = useState<Messages>({
    success: null,
    error: null,
  });

  const fetchSeqRef = useRef(0);

  const fetchAllData = useCallback(async (): Promise<boolean> => {
    const seq = ++fetchSeqRef.current;
    const [ordersResponse, inventoryResponse, paymentsResponse] = await api.fetchAllData();

    const errors = [ordersResponse.error, inventoryResponse.error, paymentsResponse.error].filter(
      Boolean,
    );

    // A newer fetch has taken over while this one was in flight; drop this stale response
    if (seq !== fetchSeqRef.current) {
      return errors.length === 0;
    }

    // Keep the previous data when a fetch fails instead of blanking the UI
    if (!ordersResponse.error) {
      setOrders(ordersResponse.data);
    }

    if (!inventoryResponse.error) {
      setInventory(inventoryResponse.data);
    }

    if (!paymentsResponse.error) {
      setPayments(paymentsResponse.data);
    }

    setInventoryStatus(inventoryResponse.error ? "error" : "ready");
    setLastRefreshed(new Date());

    if (errors.length > 0) {
      setMessages((prev) => ({ ...prev, error: errors.join("; ") }));
      return false;
    }

    // Clear any previous error messages on successful fetch
    setMessages((prev) => ({ ...prev, error: null }));
    return true;
  }, []);

  const setSuccessMessage = useCallback((message: string) => {
    setMessages((prev) => ({ ...prev, success: message }));
    // Auto-clear success message after a few seconds
    setTimeout(() => {
      setMessages((prev) => ({ ...prev, success: null }));
    }, SUCCESS_MESSAGE_DURATION_MS);
  }, []);

  useEffect(() => {
    // Initial fetch
    (async () => {
      await fetchAllData();
    })();

    // Set up auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchAllData();
    }, REFRESH_INTERVAL_MS);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  return {
    orders,
    inventory,
    payments,
    inventoryStatus,
    lastRefreshed,
    messages,
    fetchAllData,
    setSuccessMessage,
  };
};
