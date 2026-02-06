# SWAP

Software Architecture Project 2026 - University of Helsinki

## Architecture

Event-driven microservices architecture using **RabbitMQ** as the message broker.

### Services

- **Order Service** - Orchestrates order lifecycle and maintains order state
- **Inventory Service** - Manages inventory reservations and releases
- **Payment Service** - Processes payments and handles transactions

### RabbitMQ Queues

- `order-events` - Order lifecycle events (ORDER_CREATED, ORDER_CANCELLED)
- `inventory-events` - Inventory operations (INVENTORY_RESERVED, INVENTORY_FAILED, INVENTORY_RELEASED)
- `payment-events` - Payment outcomes (PAYMENT_SUCCESS, PAYMENT_FAILED)

## Flow

```mermaid
sequenceDiagram
    participant Client
    participant OrderService as Order Service
    participant RabbitMQ
    participant InventoryService as Inventory Service
    participant PaymentService as Payment Service

    Note over Client,PaymentService: Happy Path - Successful Order
    Client->>OrderService: POST /orders (create order)
    OrderService->>OrderService: Create Order (PENDING)
    OrderService->>OrderQueue: Publish ORDER_CREATED
    OrderService-->>Client: 200 OK (order created)
RabbitMQ: Publish ORDER_CREATED (order-events)
    OrderService-->>Client: 200 OK (order created)

    RabbitMQ->>InventoryService: Consume ORDER_CREATED
    InventoryService->>InventoryService: Check & Reserve Inventory
    Note over InventoryService: Simulated 2.5s processing
    InventoryService->>RabbitMQ: Publish INVENTORY_RESERVED (inventory-events)

    RabbitMQ->>PaymentService: Consume INVENTORY_RESERVED
    PaymentService->>PaymentService: Process Payment
    Note over PaymentService: Simulated 3s processing
    PaymentService->>RabbitMQ: Publish PAYMENT_SUCCESS (payment-events)

    RabbitMQ->>OrderService: Consume PAYMENT_SUCCESS
    OrderService->>OrderService: Update Order Status (COMPLETED)

    Note over Client,PaymentService: Failure Path - Payment Failed
    PaymentService->>RabbitMQ: Publish PAYMENT_FAILED (payment-events)
    RabbitMQ->>OrderService: Consume PAYMENT_FAILED
    OrderService->>OrderService: Update Order Status (CANCELLED)
    RabbitMQ
```

## Running

- See folders for instructions

## Notes

- Types are shared to ease development
- All services are in same repo to ease development
