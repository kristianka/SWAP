import { useEffect, useState } from "react";
import { type Order } from "@swap/shared";
import { api, type InventoryItem, type Payment } from "../lib/api";

const REFRESH_INTERVAL_MS = 10000;
const SUCCESS_MESSAGE_DURATION_MS = 5000;

interface Messages {
  success: string | null;
  error: string | null;
}

export const useAppData = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [messages, setMessages] = useState<Messages>({
    success: null,
    error: null,
  });

  const fetchAllData = async () => {
    const [ordersResponse, inventoryResponse, paymentsResponse] = await api.fetchAllData();

    setOrders(ordersResponse.data);
    setInventory(inventoryResponse.data);
    setPayments(paymentsResponse.data);
    setLastRefreshed(new Date());

    // Collect any errors
    const errors = [ordersResponse.error, inventoryResponse.error, paymentsResponse.error].filter(
      Boolean,
    );

    if (errors.length > 0) {
      setMessages({
        success: null,
        error: errors.join("; "),
      });
    } else {
      // Clear any previous error messages on successful fetch
      setMessages((prev) => ({ ...prev, error: null }));
    }
  };

  const setSuccessMessage = (message: string) => {
    setMessages({
      success: message,
      error: null,
    });
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      setMessages((prev) => ({ ...prev, success: null }));
    }, SUCCESS_MESSAGE_DURATION_MS);
  };

  useEffect(() => {
    // Initial fetch
    (async () => {
      const [ordersResponse, inventoryResponse, paymentsResponse] = await api.fetchAllData();
      setOrders(ordersResponse.data);
      setInventory(inventoryResponse.data);
      setPayments(paymentsResponse.data);

      // Show errors from initial load if any
      const errors = [ordersResponse.error, inventoryResponse.error, paymentsResponse.error].filter(
        Boolean,
      );

      if (errors.length > 0) {
        setMessages({
          success: null,
          error: errors.join("; "),
        });
      }
    })();

    // Set up auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchAllData();
    }, REFRESH_INTERVAL_MS);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return {
    orders,
    inventory,
    payments,
    lastRefreshed,
    messages,
    fetchAllData,
    setSuccessMessage,
  };
};
