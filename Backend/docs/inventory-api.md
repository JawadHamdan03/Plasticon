# Inventory API

Base path: /inventory

## POST /inventory/transactions
- Access: ACCOUNTANT, ADMIN
- Body:
  - materialId (required, positive integer)
  - type (required, valid InventoryType)
  - quantity (required, positive number)
  - referenceType (required, valid ReferenceType)
  - referenceId (optional)
- Notes:
  - OUT transactions fail if stock is insufficient

## GET /inventory/transactions/all
- Access: ACCOUNTANT, ADMIN

## GET /inventory/transactions/me
- Access: ACCOUNTANT, ADMIN

## GET /inventory/materials
- Access: ACCOUNTANT, ADMIN
- Description: raw material stock list

## Examples

Create inventory transaction:

POST /inventory/transactions
{
  "materialId": 7,
  "type": "OUT",
  "quantity": 12.5,
  "referenceType": "PRODUCTION",
  "referenceId": 301
}

Response:

{
  "transaction": {
    "id": 919,
    "materialId": 7,
    "type": "OUT",
    "quantity": 12.5
  },
  "updatedMaterial": {
    "id": 7,
    "currentQuantity": 410.5
  }
}
