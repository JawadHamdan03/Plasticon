# Plasticon API — Engineer Endpoints

## Machine Health & Lifecycle
- GET    /machine-health                   — all machine health records
- GET    /machine-health/{id}             — single machine health detail
- GET    /machine-health/lifecycle        — equipment lifecycle (warranty, replacement dates)
- GET    /machine-health/calibrations     — equipment calibration records (nextCalibrationDue)
- GET    /machine-health/transfers        — equipment transfer log (fromLocation → toLocation)

## Maintenance
- GET/POST /maintenance                    — maintenance records (type: BREAKDOWN | SCHEDULED | PREVENTIVE)
- GET/PUT/DELETE /maintenance/{id}
- GET    /maintenance/work-orders          — work orders (assign to technician)
- POST   /maintenance/work-orders          — create work order
- PATCH  /maintenance/work-orders/{id}    — update work order status
  Work order priorities: HIGH | MEDIUM | LOW
  Work order statuses:   OPEN | IN_PROGRESS | DONE

## Maintenance Schedule
- GET/POST /maintenance-schedule           — preventive maintenance schedule (frequency: daily/weekly/monthly)

## Maintenance Costs
- GET    /maintenance-costs                — all maintenance cost records
- GET    /maintenance-costs/summary        — summarized costs by period / machine

## Quality Checks
- GET    /quality-checks/all              — all quality checks (supports ?fromDate=&toDate=&machineId=)
  Results: PASS | FAIL | PARTIAL

## Spare Parts
- GET/POST/PUT/DELETE  /spare-parts       — spare parts inventory
- GET    /spare-part-requests             — pending requests
- PATCH  /spare-part-requests/{id}/approve
- PATCH  /spare-part-requests/{id}/reject

## Engineer Inventory
- GET    /engineer-inventory/items        — engineer-specific inventory items
- GET    /engineer-inventory/transactions — transaction log
- POST   /engineer-inventory/adjust       — adjust stock level

## Raw Material Alerts
- GET    /raw-material-alerts             — active low-stock alerts
- POST   /raw-material-alerts             — set threshold per material

## Production (Engineer read access)
- GET    /production/all?fromDate=&toDate=
- GET    /production/admin/overview

## Technical Documentation
- GET/POST/DELETE  /tech-documents        — upload and manage PDFs tagged by machine

## Machine Statuses
OPERATIONAL | UNDER_MAINTENANCE | BROKEN | OFFLINE

## Shared Endpoints Available to Engineers
- GET    /production/all
- GET    /electricity/readings
- GET    /inventory/materials
- GET    /reports
- GET    /shifts
- GET    /machines
