import { useEffect, useState } from "react";
import { type Order } from "@swap/shared";
import { RefreshCw } from "lucide-react";
import "./index.css";
import { OrderCreationCard } from "./components/OrderCreationCard";
import { Button } from "./components/ui/button";
import { InventoryTable } from "./components/tables/InventoryTable";
import { PaymentTable } from "./components/tables/PaymentTable";
import { OrderTable } from "./components/tables/OrderTable";
import { api, type InventoryItem, type Payment } from "./lib/api";

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchAllData = async () => {
    const [ordersData, inventoryData, paymentsData] = await api.fetchAllData();
    setOrders(ordersData);
    setInventory(inventoryData);
    setPayments(paymentsData);
  };

  useEffect(() => {
    // Inline async function to avoid eslint warning
    (async () => {
      const [ordersData, inventoryData, paymentsData] = await api.fetchAllData();
      setOrders(ordersData);
      setInventory(inventoryData);
      setPayments(paymentsData);
    })();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Software Architecture Project</h1>
            <p className="text-gray-400">
              Distributed transaction management with RabbitMQ and the Saga pattern
            </p>
          </div>
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="size-4 mr-2" />
            Refresh All Data
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          <div className="space-y-4">
            <OrderCreationCard onOrderCreated={fetchAllData} />
          </div>

          <div className="space-y-6">
            <OrderTable orders={orders} />
            <InventoryTable inventory={inventory} />
            <PaymentTable payments={payments} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
