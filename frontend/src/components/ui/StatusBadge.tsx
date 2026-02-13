import { OrderStatus, PaymentStatus, InventoryStatus } from "@swap/shared";
import { CheckCircle2, XCircle, AlertCircle, Package } from "lucide-react";
import { Badge } from "./badge";
import { Spinner } from "./spinner";

type Status = OrderStatus | PaymentStatus | InventoryStatus;

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getVariant = (status: Status) => {
    if (
      status === OrderStatus.COMPLETED ||
      status === PaymentStatus.SUCCESS ||
      status === InventoryStatus.RESERVED
    ) {
      return "default";
    }
    if (status === OrderStatus.CANCELLED || status === PaymentStatus.FAILED) {
      return "destructive";
    }
    if (status === OrderStatus.PROCESSING || status === InventoryStatus.RESERVING) {
      return "secondary";
    }
    if (status === InventoryStatus.NO_RESERVATIONS) {
      return "outline";
    }
    return "outline";
  };

  const getIcon = (status: Status) => {
    if (status === OrderStatus.COMPLETED || status === PaymentStatus.SUCCESS) {
      return <CheckCircle2 className="mr-1 size-3" />;
    }
    if (status === InventoryStatus.RESERVED) {
      return <Package className="mr-1 size-3" />;
    }
    if (status === OrderStatus.CANCELLED || status === PaymentStatus.FAILED) {
      return <XCircle className="mr-1 size-3" />;
    }
    if (status === OrderStatus.PROCESSING || status === InventoryStatus.RESERVING) {
      return <Spinner className="mr-1 size-3" />;
    }
    if (status === OrderStatus.PENDING || status === PaymentStatus.PENDING) {
      return <AlertCircle className="mr-1 size-3" />;
    }
    if (status === InventoryStatus.NO_RESERVATIONS) {
      return <Package className="mr-1 size-3" />;
    }
    return null;
  };

  const getClassName = (status: Status) => {
    if (
      status === OrderStatus.COMPLETED ||
      status === PaymentStatus.SUCCESS ||
      status === InventoryStatus.RESERVED
    ) {
      return "bg-green-600 hover:bg-green-600/80";
    }
    if (status === InventoryStatus.RESERVING) {
      return "bg-yellow-600 hover:bg-yellow-600/80";
    }
    return "";
  };

  const getDisplayText = (status: Status) => {
    if (status === InventoryStatus.NO_RESERVATIONS) {
      return "Idle";
    }
    if (status === InventoryStatus.RESERVING) {
      return "Reserving";
    }
    if (status === InventoryStatus.RESERVED) {
      return "Reserved";
    }
    return status;
  };

  return (
    <Badge
      variant={getVariant(status)}
      className={`${getClassName(status)} inline-flex items-center justify-center min-w-25`}
    >
      {getIcon(status)}
      <span className="text-gray-100"> {getDisplayText(status).toUpperCase()}</span>
    </Badge>
  );
};
