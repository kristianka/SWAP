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

interface PaymentTableProps {
  payments: Payment[];
}

export const PaymentTable = ({ payments }: PaymentTableProps) => {
  return (
    <Card>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
