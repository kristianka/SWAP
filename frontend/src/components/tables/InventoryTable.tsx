import type { InventoryItem } from "@swap/shared";
import { InventoryStatus } from "@swap/shared";
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
import { Spinner } from "../ui/spinner";
import { StatusBadge } from "../ui/StatusBadge";

interface InventoryTable {
  inventory: InventoryItem[];
  lastRefreshed: Date | null;
}

export const InventoryTable = ({ inventory, lastRefreshed }: InventoryTable) => {
  return (
    <Card>
      <CardContent>
        <Table>
          <TableCaption>
            Inventory database
            {lastRefreshed && (
              <span className="text-xs text-gray-500 ml-2">
                (Last updated: {lastRefreshed.toLocaleTimeString()})
              </span>
            )}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-70">ID</TableHead>
              <TableHead className="w-40">Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Stock Level</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const isProcessing =
                  item.reservationStatus === InventoryStatus.RESERVING ||
                  item.reservationStatus === InventoryStatus.RESERVED;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell>
                      {isProcessing ? (
                        <Spinner className="text-yellow-500" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.reservationStatus} />
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.stock_level}</TableCell>
                    <TableCell className="text-right">{item.reserved}</TableCell>
                    <TableCell className="text-right">{item.available}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
