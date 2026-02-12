import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Spinner } from "./ui/spinner";

interface InventoryItem {
  id: string;
  name: string;
  stock_level: number;
  reserved: number;
  available: number;
}

interface SelectedItem {
  product: string;
  quantity: number;
  name: string;
  maxAvailable: number;
}

interface OrderCreationCardProps {
  onOrderCreated: () => void;
}

export const OrderCreationCard = ({ onOrderCreated }: OrderCreationCardProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch("http://localhost:3002/inventory");
      if (res.ok) {
        setInventory(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  };

  const getItemQuantity = (itemId: string) => {
    return selectedItems.find((i) => i.product === itemId)?.quantity || 0;
  };

  const updateQuantity = (item: InventoryItem, newQuantity: number) => {
    const clampedQuantity = Math.max(0, Math.min(newQuantity, item.available));

    if (clampedQuantity === 0) {
      // Remove item if quantity is 0
      setSelectedItems(selectedItems.filter((i) => i.product !== item.id));
    } else {
      const existingItem = selectedItems.find((i) => i.product === item.id);
      if (existingItem) {
        // Update existing item
        setSelectedItems(
          selectedItems.map((i) =>
            i.product === item.id ? { ...i, quantity: clampedQuantity } : i,
          ),
        );
      } else {
        // Add new item
        setSelectedItems([
          ...selectedItems,
          {
            product: item.id,
            quantity: clampedQuantity,
            name: item.name,
            maxAvailable: item.available,
          },
        ]);
      }
    }
  };

  const createOrder = async () => {
    if (selectedItems.length === 0) {
      setError("Please add at least one item to the order");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const orderPayload = {
      items: selectedItems.map(({ product, quantity }) => ({
        product,
        quantity,
      })),
    };

    try {
      const response = await fetch("http://localhost:3001/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      setSuccess(true);
      setSelectedItems([]);
      setTimeout(() => setSuccess(false), 3000);
      onOrderCreated();
      fetchInventory(); // Refresh inventory to show updated available counts
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="size-5" />
            Create Order
          </h2>
          <p className="text-sm text-gray-400 mt-1">Select items to test the RabbitMQ pipeline</p>
        </div>

        {/* Items */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Items</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {inventory.length === 0 ? (
              <p className="text-sm text-gray-400">No items available</p>
            ) : (
              inventory.map((item) => {
                const quantity = getItemQuantity(item.id);
                const isOutOfStock = item.available === 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      quantity > 0
                        ? "border-blue-500 bg-blue-500/10"
                        : isOutOfStock
                          ? "border-gray-700 bg-gray-800/50 opacity-50"
                          : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        Available: {item.available} / {item.stock_level}
                      </div>
                    </div>

                    {quantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item, quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          readOnly
                          className="w-16 text-center"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item, quantity + 1)}
                          disabled={quantity >= item.available}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateQuantity(item, 1)}
                        disabled={isOutOfStock}
                      >
                        <Plus className="size-4 mr-1" />
                        {isOutOfStock ? "Out of Stock" : "Add"}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500 text-red-500 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500 text-green-500 text-sm">
            Order created successfully! Watch the tables update.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button
              onClick={() => setSelectedItems([])}
              disabled={loading}
              variant="outline"
              size="lg"
            >
              <Trash2 className="mr-2 size-4" />
              Clear Cart
            </Button>
          )}
          <Button
            onClick={createOrder}
            disabled={loading || selectedItems.length === 0}
            className="flex-1"
            size="lg"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Creating Order...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 size-4" />
                Create Order ({selectedItems.length} {selectedItems.length === 1 ? "item" : "items"}
                )
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
