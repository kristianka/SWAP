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
              <TableHead className="w-70">ID</TableHead>
              <TableHead className="w-40">Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order ID</TableHead>
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
                    <TableCell>
                      {isProcessing ? (
                        <Spinner className="text-blue-500" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>

                    <TableCell className="font-mono text-xs">{payment.order_id}</TableCell>
                    <TableCell className="text-right">${payment.amount}</TableCell>
                    <TableCell className="">
                      {payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}
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
