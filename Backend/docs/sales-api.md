# Sales API

Base path: /sales

## POST /sales
- Access: ACCOUNTANT, ADMIN
- Body:
  - customerId (required, positive integer)
  - invoiceImage (required)
  - date (optional, valid date)
  - totalAmount (optional, auto-computed if omitted)
  - items (required, non-empty array)
- Item fields:
  - machineType (required)
  - size (required)
  - quantity (required, positive number)
  - pricePerUnit (required, zero or positive number)

## GET /sales/all
- Access: ACCOUNTANT, ADMIN

## GET /sales/me
- Access: ACCOUNTANT, ADMIN

## Examples

Create sale:

POST /sales
{
  "customerId": 4,
  "invoiceImage": "invoices/sale-2026-04-02.png",
  "items": [
    { "machineType": "CAPS", "size": "28mm", "quantity": 5000, "pricePerUnit": 0.05 },
    { "machineType": "PREFORM", "size": "30g", "quantity": 3000, "pricePerUnit": 0.08 }
  ]
}

Response:

{
  "id": 211,
  "customerId": 4,
  "totalAmount": 490,
  "createdAt": "2026-04-02T13:00:00.000Z"
}
