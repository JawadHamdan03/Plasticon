# Plasticon API — Worker Endpoints & Tools

## Production Recording
- POST   /production                      — submit production record
  Preform: { machineId, shiftId, boxes:[{cavities, cycles, numberOfBoxes}], notes, rawPetUsed, colorUsed }
  Caps:    { machineId, shiftId, cartonsCount, notes, rawHdpeUsed, rawLdpeUsed, colorUsed }
- GET    /production/me                   — my own production history

## Attendance
- POST   /attendance/check-in            — check in at start of shift
- POST   /attendance/check-out           — check out at end of shift
- GET    /attendance/me                  — my own attendance records

## Worker Tools (all under /worker-tools)
- POST   /worker-tools/machine-stop-alert
  Body: { machineLabel, reason, priority: CRITICAL|HIGH|NORMAL, startedAt }
  Use when a machine breaks down and needs urgent attention.

- GET/POST /worker-tools/checklist
  Shift checklist with digital signature. Submit at START and END of shift.

- POST   /worker-tools/material-waste
  Log wasted raw material per machine: { machineId, material, quantityKg, reason }

- GET/POST /worker-tools/daily-targets
  Set and track daily production targets vs actuals.

- POST   /worker-tools/kaizen-idea
  Submit a continuous improvement suggestion: { title, description, category, expectedBenefit }

- POST   /worker-tools/quality-issue
  Report a defect with photo: { batchCode, machineLabel, issueType, description, photo }

- POST   /worker-tools/micro-stop
  Log brief machine stoppage (< 10 min): { machineId, durationMinutes, reason }

- POST   /worker-tools/electricity-anomaly
  Flag abnormal kWh reading (default threshold ratio: 1.3×): { shiftId, actualKwh, expectedKwh }

## Machine Snapshots
- POST   /settings/snapshots
  Submit machine counter + electricity kWh readings with photo.
  Body: { machineId, counterReading, kwhReading, photoFile }

## Payroll (read-only)
- GET    /payroll/me                      — view own payroll records

## Notifications
- GET    /notifications/me               — view own notifications
- PATCH  /notifications/{id}/read        — mark as read

## Priority Levels for Machine Stops
- CRITICAL — machine fully stopped, production halted
- HIGH     — machine degraded, needs attention soon
- NORMAL   — minor issue, can wait for scheduled maintenance
