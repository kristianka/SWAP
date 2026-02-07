import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { OrderStatus, type Order } from "@swap/shared";
import { useEffect, useState } from "react";
import "./index.css";
import { CreateOrderButton } from "./components/CreateOrderButton";
import { Badge } from "./components/ui/badge";
import { Spinner } from "./components/ui/spinner";
import { Button } from "./components/ui/button";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

// Database-specific interfaces (not in shared types as they're storage implementation details)
interface InventoryItem {
  id: string;
  name: string;
  stock_level: number;
  reserved: number;
  available: number;
  created_at: string;
  updated_at: string;
  version: number;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  version: number;
}

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:3001/orders");
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("http://localhost:3002/inventory");
      if (res.ok) setInventory(await res.json());
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch("http://localhost:3003/payments");
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  };

  const fetchAllData = () => {
    fetchOrders();
    fetchInventory();
    fetchPayments();
  };

  // fetch data from APIs, subscribe to events, etc.
  useEffect(() => {
    fetchAllData();
  }, []);

  console.log("Orders:", orders);
  console.log("Inventory:", inventory);
  console.log("Payments:", payments);

  return (
    <div className="m-5">
      <h1 className="text-2xl font-bold mb-4">Software Architecture Project</h1>

      <div className="flex gap-2 mb-4">
        <CreateOrderButton onOrderCreated={fetchAllData} />
        <Button variant="outline" onClick={fetchAllData}>
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Table>
        <TableCaption>Orders database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">ID</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell>
                  {order.items.map((item, i) => (
                    <div key={i}>
                      {item.product} x{item.quantity}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === OrderStatus.COMPLETED
                        ? "default"
                        : order.status === OrderStatus.CANCELLED
                          ? "destructive"
                          : order.status === OrderStatus.PROCESSING
                            ? "secondary"
                            : "outline"
                    }
                    className={
                      order.status === OrderStatus.COMPLETED
                        ? "bg-green-600 hover:bg-green-600/80"
                        : ""
                    }
                  >
                    {order.status === OrderStatus.PROCESSING && <Spinner className="mr-1 size-3" />}
                    {order.status === OrderStatus.COMPLETED && (
                      <CheckCircle2 className="mr-1 size-3" />
                    )}
                    {order.status === OrderStatus.CANCELLED && <XCircle className="mr-1 size-3" />}
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Table>
        <TableCaption>Inventory database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Stock Level</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No inventory items found
              </TableCell>
            </TableRow>
          ) : (
            inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">{item.stock_level}</TableCell>
                <TableCell className="text-right">{item.reserved}</TableCell>
                <TableCell className="text-right">{item.available}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Table>
        <TableCaption>Payments database</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">ID</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                <TableCell className="font-mono text-xs">{payment.order_id}</TableCell>
                <TableCell>
                  <span
                    className={
                      payment.status === "SUCCESS" || payment.status === "success"
                        ? "text-green-600"
                        : payment.status === "FAILED" || payment.status === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                    }
                  >
                    {payment.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default App;
