# Settings API

Base path: /settings

## GET /settings/production
- Access: ADMIN
- Description: list production settings

## PUT /settings/production/:productType
- Access: ADMIN
- Params:
  - productType (valid ProductType)
- Body:
  - piecesPerCarton (positive integer)

## GET /settings/system
- Access: ADMIN
- Description: get current system settings

## PUT /settings/system
- Access: ADMIN
- Body (all required):
  - qualityCheckIntervalMinutes (positive number)
  - qualityCheckReminderMinutes (zero or positive number)
  - inventoryAuditFrequency (valid InventoryAuditFrequency)
  - shiftEndReminderMinutes (positive number)
  - weeklyReportDayOfWeek (1-7)
  - weeklyReportTime (HH:mm)
  - monthlyReportDayOfMonth (1-31)
  - monthlyReportTime (HH:mm)

## Examples

Update production setting:

PUT /settings/production/CAPS
{
  "piecesPerCarton": 1800
}

Update system setting:

PUT /settings/system
{
  "qualityCheckIntervalMinutes": 60,
  "qualityCheckReminderMinutes": 10,
  "inventoryAuditFrequency": "WEEKLY",
  "shiftEndReminderMinutes": 30,
  "weeklyReportDayOfWeek": 5,
  "weeklyReportTime": "18:00",
  "monthlyReportDayOfMonth": 28,
  "monthlyReportTime": "17:00"
}
