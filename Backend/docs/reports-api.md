# Reports API

Base path: /reports

## GET /reports/production/weekly
- Access: ACCOUNTANT, ADMIN
- Query:
  - date (optional, valid date)
- Returns:
  - week totals and breakdown by day, shift, machine

## GET /reports/sales/monthly
- Access: ACCOUNTANT, ADMIN
- Query:
  - month (optional, YYYY-MM)
- Returns:
  - monthly totals and breakdown by customer/day

## GET /reports/inventory/snapshot
- Access: ACCOUNTANT, ADMIN
- Query:
  - lowStockThreshold (optional, default 50)
- Returns:
  - stock totals, low stock list, and last transaction per material

## Examples

Weekly production summary:

GET /reports/production/weekly?date=2026-04-02

Monthly sales summary:

GET /reports/sales/monthly?month=2026-04

Inventory snapshot:

GET /reports/inventory/snapshot?lowStockThreshold=40

Inventory snapshot response:

{
  "generatedAt": "2026-04-02T14:00:00.000Z",
  "lowStockThreshold": 40,
  "totals": {
    "materialsCount": 12,
    "totalQuantity": 1850,
    "lowStockCount": 2
  }
}
