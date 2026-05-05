# ENGINEER Role — Documentation

## Role Summary
The Engineer manages all technical operations: production reporting, machine maintenance, quality control, spare parts, equipment calibration, and technical documentation. Engineers **own** the data they create and can edit/delete their own records.

## Permissions Matrix
| Module | View | Create | Edit | Delete |
|---|---|---|---|---|
| Production | ✅ (own) | ❌ (Worker only) | ❌ | ❌ |
| Quality Checks | ✅ (own) | ✅ | ✅ | ✅ |
| Maintenance Reports | ✅ (own) | ✅ | ❌ | ❌ |
| Machine Health | ✅ (all) | ✅ | ✅ | ✅ |
| Maintenance Schedule | ✅ (all) | ✅ | ✅ | ✅ |
| Spare Parts | ✅ (all) | ✅ | ✅ | ✅ |
| Parts Inventory | ✅ (own) | ✅ | ✅ | ✅ |
| Equipment Lifecycle | ✅ | ✅ | ✅ | ✅ |
| Production Analytics | ✅ (charts) | — | — | — |
| Quality Trends | ✅ (charts) | — | — | — |
| Technical Docs | ✅ | ✅ | ✅ | ✅ |
| Calibration | ✅ | ✅ | ✅ | ✅ |
| Work Orders | ✅ | — | — | — |
| Equipment Transfer | ✅ | — | — | — |
| Maintenance Cost | ✅ | ✅ | ✅ | ✅ |
| Raw Material Alerts | ✅ | ✅ (update stock) | ✅ | — |
| My Attendance | ✅ | — | — | — |
| My Payroll | ✅ | — | — | — |
| Notifications | ✅ | — | — | — |
| Chat | ✅ | ✅ | — | — |

## Navigation Sections

### Engineering Tools

#### Production
- View production records. Engineers cannot create production records — that is done by Workers.
- Use **Production Analytics** for trend charts on output, efficiency, and downtime.

#### Quality Checks (`/quality-checks`)
- Log quality issues found during production.
- Fields: Machine, Issue Type (Dimensional/Surface Defect/Material Fault/etc.), Severity (Low/Medium/High/Critical), Description.
- Mark issues as resolved by setting `resolvedAt`.

#### Maintenance (`/maintenance`)
- Submit maintenance reports after repairing a machine.
- Fields: Machine, Parts Used, Downtime Minutes, Downtime Reason, Report Details.
- Cannot edit/delete submitted reports (audit trail).

#### Machine Health Dashboard (`/engineer/machines`)
- Record operational health snapshots per machine.
- Fields: Machine, Operational Status (Operational/Maintenance/Downtime), Downtime %, Maintenance Hours, Efficiency Rating %, Notes.
- Edit and delete own records. KPIs show average efficiency and operational count.

#### Preventive Maintenance Schedule (`/engineer/maintenance-schedule`)
- Create recurring maintenance schedules per machine.
- Fields: Machine, Schedule Type (Preventive/Corrective/Predictive), Frequency (Daily/Weekly/Monthly/Quarterly), Next Date, Description.
- Mark schedules as **Completed** with the ✓ quick-action button. Edit and delete.
- Overdue schedules are highlighted in orange.

#### Spare Parts Management (`/engineer/spare-parts`)
- Track spare part inventory per machine.
- Fields: Machine, Part Name, Quantity, Min Quantity (alert threshold), Unit Price, Supplier, Notes.
- Parts at or below Min Quantity show orange low-stock warning.
- Edit quantity, price, and supplier info. Delete parts.

#### Parts Inventory (`/engineer/inventory`)
- Monthly inventory report per engineer.
- Add parts with photos, quantities. Submit for accountant review.
- After submission, accountant can add unit prices to calculate total value.

#### Equipment Lifecycle Tracking (`/engineer/equipment-lifecycle`)
- Record lifecycle events per machine: installation date, last service, expected retirement, total operating hours.

#### Production Analytics (`/engineer/production-analytics`)
- Charts: daily output per machine, efficiency trends, downtime patterns.
- Read-only aggregated view from all production records.

#### Quality Trend Reports (`/engineer/quality-trends`)
- Charts: issue frequency by type, severity distribution, resolution rate over time.

#### Technical Documentation (`/engineer/documentation`)
- Upload and manage technical manuals, SOPs, wiring diagrams for each machine.

#### Equipment Calibration (`/engineer/calibration`)
- Log calibration checks: date, next due date, result, technician.

#### Work Orders (`/engineer/work-orders`)
- View maintenance records as work orders (read-only composite view).

#### Equipment Transfer Log (`/engineer/equipment-transfer`)
- View history of machine movements/redeployments.

#### Maintenance Cost Tracking (`/engineer/maintenance-costs`)
- Link maintenance reports to actual costs: spare parts consumed (qty × unit price), labor hours × hourly rate.
- Calculates total cost per repair. Accountant can view cost reports.

### Raw Material Alerts (`/engineer/raw-material-alerts`)
- View all raw materials with current stock vs minimum threshold.
- Update stock levels as materials arrive or are used.
- Automatic notification sent to Engineer and Accountant when any material drops below its threshold.

### Personal
- **My Attendance** — personal check-in/out history
- **My Payroll** — monthly salary summary
- **Notifications** — alerts for quality issues, maintenance overdue, low stock
- **Chat** — group messaging

## Key Workflows
1. **After a machine breakdown**: Maintenance → New Report → fill machine, parts used, downtime → Save
2. **Scheduling preventive maintenance**: Maintenance Schedule → Create Schedule → set frequency and next date
3. **Monitoring low stock**: Spare Parts → check orange-highlighted rows → Edit to update quantity
4. **Monthly parts audit**: Parts Inventory → New Report → add all parts with photos → Submit
5. **Recording repair cost**: Maintenance Cost → New Cost → link to maintenance record → add parts and labor
