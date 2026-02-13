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
import { PaymentStatus } from "@swap/shared";
import { Spinner } from "../ui/spinner";

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
              <TableHead>Processing</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              displayedPayments.map((payment) => {
                const isProcessing = payment.status === PaymentStatus.PENDING;
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.order_id}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      {isProcessing ? (
                        <Spinner className="text-blue-500" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">${payment.amount}</TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {new Date(payment.created_at).toLocaleString()}
                    </TableCell>
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
