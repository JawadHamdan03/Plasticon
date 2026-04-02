# Purchases API

Base path: /purchases

## POST /purchases
- Access: ACCOUNTANT, ADMIN
- Body:
  - supplierId (required, positive integer)
  - invoiceImage (required)
  - date (optional, valid date)
  - totalAmount (optional, auto-computed if omitted)
  - items (required, non-empty array)
- Item fields:
  - materialId (required, positive integer)
  - quantity (required, positive number)
  - pricePerUnit (required, zero or positive number)
- Notes:
  - creates Inventory IN transactions and increases stock for each item

## GET /purchases/all
- Access: ACCOUNTANT, ADMIN

## GET /purchases/me
- Access: ACCOUNTANT, ADMIN

## Examples

Create purchase:

POST /purchases
{
  "supplierId": 2,
  "invoiceImage": "invoices/purchase-2026-04-02.png",
  "items": [
    { "materialId": 1, "quantity": 100, "pricePerUnit": 2.2 },
    { "materialId": 2, "quantity": 60, "pricePerUnit": 1.9 }
  ]
}

Response:

{
  "id": 120,
  "supplierId": 2,
  "totalAmount": 334,
  "items": [
    { "materialId": 1, "quantity": 100, "pricePerUnit": 2.2 },
    { "materialId": 2, "quantity": 60, "pricePerUnit": 1.9 }
  ]
}
