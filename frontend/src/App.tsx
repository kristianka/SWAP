import "./index.css";
import { useState } from "react";
import { OrderCreationCard } from "./components/OrderCreationCard";
import { InventoryTable } from "./components/tables/InventoryTable";
import { PaymentTable } from "./components/tables/PaymentTable";
import { OrderTable } from "./components/tables/OrderTable";
import { Header } from "./components/Header";
import { useAppData } from "./hooks/useAppData";
import { Footer } from "./components/Footer";
import { getOrCreateSessionId, regenerateSessionId } from "./lib/api";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { SeedItems } from "./components/SeedItems";

function App() {
  const { orders, inventory, payments, lastRefreshed, messages, fetchAllData, setSuccessMessage } =
    useAppData();
  const [sessionId, setSessionId] = useState(getOrCreateSessionId());

  const handleRegenerateSession = async () => {
    const newSessionId = await regenerateSessionId();
    setSessionId(newSessionId);
    await fetchAllData();
    setSuccessMessage("New session created and inventory seeded! Your data is now isolated.");
  };

  return (
    <div className="min-h-screen m-8">
      <div className=" mx-auto">
        <Header
          lastRefreshed={lastRefreshed}
          successMessage={messages.success}
          errorMessage={messages.error}
          fetchAllData={fetchAllData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          <div className="space-y-4">
            <OrderCreationCard onOrderCreated={fetchAllData} onSuccess={setSuccessMessage} />
            <SeedItems onSeedComplete={fetchAllData} />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <OrderTable orders={orders} lastRefreshed={lastRefreshed} />
              <div className="flex items-center gap-2 text-xs text-gray-500 px-4">
                <span>
                  Session ID: <span className="font-mono">{sessionId}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateSession}
                  className="h-6 px-2"
                  title="Generate new session ID"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <InventoryTable inventory={inventory} lastRefreshed={lastRefreshed} />
            <PaymentTable payments={payments} lastRefreshed={lastRefreshed} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
