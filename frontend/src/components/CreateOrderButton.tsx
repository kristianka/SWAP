import { useState } from "react";
import { Button } from "./ui/button";

interface CreateOrderButtonProps {
  onOrderCreated: () => void;
}

export const CreateOrderButton = ({ onOrderCreated }: CreateOrderButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [polling, setPolling] = useState(false);

  const createDummyOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const dummyOrder = {
      items: [
        {
          product: "prod-001",
          quantity: 2,
        },
        {
          product: "prod-002",
          quantity: 1,
        },
        {
          product: "prod-003",
          quantity: 3,
        },
      ],
    };

    try {
      const response = await fetch("http://localhost:3001/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dummyOrder),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const order = await response.json();
      setSuccess(true);

      // Start polling until order is completed/cancelled (max 30 seconds)
      setPolling(true);
      const intervalId = setInterval(async () => {
        onOrderCreated();

        // Check if order has reached a terminal state
        try {
          const statusResponse = await fetch(`http://localhost:3001/orders/${order.id}`);
          if (statusResponse.ok) {
            const orderData = await statusResponse.json();
            if (orderData.status === "COMPLETED" || orderData.status === "CANCELLED") {
              clearInterval(intervalId);
              // Wait a bit for inventory to be confirmed, then do a final refresh
              setTimeout(() => {
                onOrderCreated();
                setPolling(false);
              }, 3000);
            }
          }
        } catch {
          // Ignore errors, continue polling
        }
      }, 500);

      // Stop polling after 30 seconds as fallback
      setTimeout(() => {
        clearInterval(intervalId);
        setPolling(false);
      }, 30000);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <Button onClick={createDummyOrder} disabled={loading || polling}>
        {loading ? "Creating Order..." : polling ? "Polling..." : "Create Dummy Order"}
      </Button>
    </div>
  );
};
