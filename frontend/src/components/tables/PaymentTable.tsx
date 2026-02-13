import type { Payment } from "@swap/shared/types";
import { Card, CardContent } from "../ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { StatusBadge } from "../ui/StatusBadge";

interface PaymentTableProps {
  payments: Payment[];
  lastRefreshed: Date | null;
}

export const PaymentTable = ({ payments, lastRefreshed }: PaymentTableProps) => {
  // only first three
  const displayedPayments = payments.slice(0, 3);

  return (
    <Card>
      <CardContent>
        <Table>
          <TableCaption>
            Payments database
            {lastRefreshed && (
              <span className="text-xs text-gray-500 ml-2">
                (Last updated: {lastRefreshed.toLocaleTimeString()})
              </span>
            )}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-50">ID</TableHead>
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
              displayedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.order_id}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-right">${payment.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
