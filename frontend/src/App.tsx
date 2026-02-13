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
          sessionId={sessionId}
          onRegenerateSession={handleRegenerateSession}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          <div className="space-y-4">
            <OrderCreationCard onOrderCreated={fetchAllData} onSuccess={setSuccessMessage} />
            {/* <SeedItems onSeedComplete={fetchAllData} /> */}
          </div>

          <div className="space-y-6">
            <OrderTable orders={orders} lastRefreshed={lastRefreshed} />
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
