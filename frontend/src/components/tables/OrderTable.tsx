import { useState } from "react";
import { OrderStatus, type Order } from "@swap/shared";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface OrderTableProps {
  orders: Order[];
  lastRefreshed: Date | null;
}

export const OrderTable = ({ orders, lastRefreshed }: OrderTableProps) => {
  const [openErrorPopover, setOpenErrorPopover] = useState<string | null>(null);

  return (
    <Card>
      <CardContent>
        <Table>
          <TableCaption>
            Orders database
            {lastRefreshed && (
              <span className="text-xs text-gray-500 ml-2">
                (Last updated: {lastRefreshed.toLocaleTimeString()})
              </span>
            )}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
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
                      {order.status === OrderStatus.PROCESSING && (
                        <Spinner className="mr-1 size-3" />
                      )}
                      {order.status === OrderStatus.COMPLETED && (
                        <CheckCircle2 className="mr-1 size-3" />
                      )}
                      {order.status === OrderStatus.CANCELLED && (
                        <XCircle className="mr-1 size-3" />
                      )}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.errorMessage ? (
                      <Popover
                        open={openErrorPopover === order.id}
                        onOpenChange={(open) => !open && setOpenErrorPopover(null)}
                      >
                        <PopoverTrigger asChild>
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onMouseEnter={() => setOpenErrorPopover(order.id)}
                            onMouseLeave={() => setOpenErrorPopover(null)}
                          >
                            <AlertCircle className="size-4 text-red-600 flex-shrink-0" />
                            <span className="text-red-600 text-sm truncate max-w-[120px]">
                              {order.errorMessage.length > 40
                                ? order.errorMessage.slice(0, 40) + "..."
                                : order.errorMessage}
                            </span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80"
                          onMouseEnter={() => setOpenErrorPopover(order.id)}
                          onMouseLeave={() => setOpenErrorPopover(null)}
                        >
                          <div className="space-y-2">
                            <h4 className="font-semibold text-red-600">Error Details</h4>
                            <p className="text-sm text-gray-300 break-words">
                              {order.errorMessage}
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
