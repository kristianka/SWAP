import { useState } from "react";

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

      setSuccess(true);

      // Start polling for 30 seconds
      setPolling(true);
      const intervalId = setInterval(() => {
        onOrderCreated();
      }, 500);

      // Stop polling after 30 seconds
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
      <button
        onClick={createDummyOrder}
        disabled={loading || polling}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating Order..." : polling ? "Polling..." : "Create Dummy Order"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">Error: {error}</p>}
      {success && (
        <p className="mt-2 text-sm text-green-600">
          Order created successfully! Polling for updates...
        </p>
      )}
    </div>
  );
};
