import { OrderStatus, PaymentStatus } from "@swap/shared";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "./badge";
import { Spinner } from "./spinner";

type Status = OrderStatus | PaymentStatus;

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getVariant = (status: Status) => {
    if (status === OrderStatus.COMPLETED || status === PaymentStatus.SUCCESS) {
      return "default";
    }
    if (status === OrderStatus.CANCELLED || status === PaymentStatus.FAILED) {
      return "destructive";
    }
    if (status === OrderStatus.PROCESSING) {
      return "secondary";
    }
    return "outline";
  };

  const getIcon = (status: Status) => {
    if (status === OrderStatus.COMPLETED || status === PaymentStatus.SUCCESS) {
      return <CheckCircle2 className="mr-1 size-3" />;
    }
    if (status === OrderStatus.CANCELLED || status === PaymentStatus.FAILED) {
      return <XCircle className="mr-1 size-3" />;
    }
    if (status === OrderStatus.PROCESSING) {
      return <Spinner className="mr-1 size-3" />;
    }
    if (status === OrderStatus.PENDING || status === PaymentStatus.PENDING) {
      return <AlertCircle className="mr-1 size-3" />;
    }
    return null;
  };

  const getClassName = (status: Status) => {
    if (status === OrderStatus.COMPLETED || status === PaymentStatus.SUCCESS) {
      return "bg-green-600 hover:bg-green-600/80";
    }
    return "";
  };

  return (
    <Badge variant={getVariant(status)} className={getClassName(status)}>
      {getIcon(status)}
      {status}
    </Badge>
  );
};
