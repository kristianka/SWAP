import type {
  OrderStatus,
  OrderEventType,
  InventoryEventType,
  PaymentEventType,
  PaymentStatus,
  InventoryStatus,
} from "./constants";

// ===========================================
// Domain Models
// ===========================================
export interface OrderItem {
  product: string;
  quantity: number;
}

export interface Order {
  id: string;
  sagaId: string; // Unique identifier for the entire saga/transaction
  sessionId: string; // User session for demo isolation
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  errorMessage?: string; // Error message when order fails
  paymentBehaviour?: "success" | "failure" | "random"; // For testing failure scenarios
  inventoryBehaviour?: "success" | "failure" | "random"; // For testing failure scenarios
  skipDemoDelays?: boolean; // Skip artificial delays for faster processing
}

// ===========================================
// Event Payloads (what services exchange)
// ===========================================

// Base event interface with correlation ID for tracing
export interface BaseEvent {
  correlationId: string; // Tracks the entire saga/transaction
  sessionId: string; // User session for demo isolation
  timestamp: string;
}

// Order Service events
export interface OrderEvent extends BaseEvent {
  type: OrderEventType;
  data: Order;
}

export type OrderCreatedEvent = OrderEvent;

// Inventory Service events
export interface InventoryReservedEvent extends BaseEvent {
  type: InventoryEventType.INVENTORY_RESERVED;
  data: {
    orderId: string;
    items: OrderItem[];
    paymentBehaviour?: "success" | "failure" | "random";
    inventoryBehaviour?: "success" | "failure" | "random";
    skipDemoDelays?: boolean;
  };
}

export interface InventoryFailedEvent extends BaseEvent {
  type: InventoryEventType.INVENTORY_FAILED;
  data: {
    orderId: string;
    reason: string;
  };
}

export interface InventoryReleasedEvent extends BaseEvent {
  type: InventoryEventType.INVENTORY_RELEASED;
  data: {
    orderId: string;
    items: OrderItem[];
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  stock_level: number;
  reserved: number;
  available: number;
  reservationStatus: InventoryStatus;
}

export type InventoryEvent = InventoryReservedEvent | InventoryFailedEvent | InventoryReleasedEvent;

// Payment Service events
export interface PaymentSuccessEvent extends BaseEvent {
  type: PaymentEventType.PAYMENT_SUCCESS;
  data: {
    orderId: string;
    amount: number;
    transactionId: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  type: PaymentEventType.PAYMENT_FAILED;
  data: {
    orderId: string;
    reason: string;
  };
}

export interface Payment {
  id: string;
  session_id?: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  updated_at?: string;
  version?: number;
}

export type PaymentEvent = PaymentSuccessEvent | PaymentFailedEvent;
