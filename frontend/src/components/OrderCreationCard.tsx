import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ShoppingCart, Plus, Minus, Trash2, Info } from "lucide-react";
import { Spinner } from "./ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { type InventoryItem } from "@swap/shared";
import { api } from "../lib/api";
import { BehaviourSelect } from "./BehaviourSelect";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

interface SelectedItem {
  product: string;
  quantity: number;
  name: string;
  maxAvailable: number;
}

interface OrderCreationCardProps {
  onOrderCreated: () => void;
  onSuccess: (message: string) => void;
}

export const OrderCreationCard = ({ onOrderCreated, onSuccess }: OrderCreationCardProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // demo test options
  const [inventoryBehaviour, setInventoryBehaviour] = useState<"success" | "failure" | "random">(
    "success",
  );
  const [paymentBehaviour, setPaymentBehaviour] = useState<"success" | "failure" | "random">(
    "success",
  );
  const [skipDemoDelays, setSkipDemoDelays] = useState(false);

  const fetchInventory = async () => {
    const response = await api.fetchInventory();
    if (response.error) {
      console.error("Failed to fetch inventory:", response.error);
    } else {
      setInventory(response.data);
    }
  };

  useEffect(() => {
    // Fetch inventory on mount
    (async () => {
      const response = await api.fetchInventory();
      if (response.error) {
        console.error("Failed to fetch inventory:", response.error);
      } else {
        setInventory(response.data);
      }
    })();
  }, []);

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

    const items = selectedItems.map(({ product, quantity }) => ({
      product,
      quantity,
    }));

    const response = await api.createOrder(
      items,
      paymentBehaviour,
      inventoryBehaviour,
      skipDemoDelays,
    );

    if (response.error) {
      setError(response.error);
    } else {
      onSuccess("Order created successfully! Watch the tables update.");
      setSelectedItems([]);
      onOrderCreated();
      fetchInventory(); // Refresh inventory to show updated available counts

      // Start polling every 500ms for 10 seconds
      setPolling(true);
      const intervalId = setInterval(() => {
        onOrderCreated();
      }, 500);

      // Stop polling after 10 seconds
      setTimeout(() => {
        clearInterval(intervalId);
        setPolling(false);
      }, 10000);
    }

    setLoading(false);
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

        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold mb-3">Demo Options</h3>
          <TooltipProvider>
            <div className="space-y-3">
              <BehaviourSelect
                label="Inventory behaviour"
                value={inventoryBehaviour}
                onChange={setInventoryBehaviour}
                tooltip="In real world, inventory may fail if stock is updated during processing"
              />
              <BehaviourSelect
                label="Payment behaviour"
                value={paymentBehaviour}
                onChange={setPaymentBehaviour}
                tooltip="In real world, payment may fail if credit card details are incorrect or insufficient funds"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skip-delays"
                  checked={skipDemoDelays}
                  onCheckedChange={(checked) => setSkipDemoDelays(checked === true)}
                />

                <Label htmlFor="skip-delays" className="cursor-pointer font-normal text-gray-300">
                  Skip demo delays (for faster testing)
                </Label>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-gray-400 hover:text-gray-300 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      Skips the artificial delays. Use this if you want to quickly test different
                      scenarios without waiting for the full processing time.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button
              onClick={() => setSelectedItems([])}
              disabled={loading || polling}
              variant="outline"
              size="lg"
            >
              <Trash2 className="mr-2 size-4" />
              Clear Cart
            </Button>
          )}
          <Button
            onClick={createOrder}
            disabled={loading || polling || selectedItems.length === 0}
            className="flex-1"
            size="lg"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Creating Order...
              </>
            ) : polling ? (
              <>
                <Spinner className="mr-2" />
                Polling...
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
