import { Button } from "./ui/button";
import { getOrCreateSessionId } from "../lib/api";

const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || "http://localhost:3002";

export const SeedItems = ({ onSeedComplete }: { onSeedComplete?: () => void }) => {
  const handleSeed = async () => {
    try {
      const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/seed`, {
        method: "POST",
        headers: {
          "x-session-id": getOrCreateSessionId(),
        },
      });
      if (response.ok) {
        onSeedComplete?.();
      }
    } catch (error) {
      console.error("Failed to seed inventory:", error);
    }
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleSeed}>
        Seed Inventory
      </Button>
    </div>
  );
};
