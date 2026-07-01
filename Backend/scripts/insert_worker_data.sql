-- Insert test data into all 8 worker feature tables

-- 1. worker_machine_stop_alerts
INSERT INTO worker_machine_stop_alerts (user_id, machine_label, priority, reason, started_at, resolved_at, response_minutes, created_at) VALUES
(2,  'Extruder-A1',   'CRITICAL', 'Overheating detected in barrel zone 3',        NOW() - INTERVAL '6 days 3 hours',  NOW() - INTERVAL '6 days 2 hours',  60,   NOW() - INTERVAL '6 days 3 hours'),
(5,  'Injection-B2',  'HIGH',     'Hydraulic pressure drop below threshold',       NOW() - INTERVAL '5 days 5 hours',  NOW() - INTERVAL '5 days 4 hours',  55,   NOW() - INTERVAL '5 days 5 hours'),
(6,  'Mixer-C1',      'NORMAL',   'Vibration slightly elevated - monitoring',      NOW() - INTERVAL '4 days 2 hours',  NOW() - INTERVAL '4 days 1 hour',   40,   NOW() - INTERVAL '4 days 2 hours'),
(8,  'Extruder-A2',   'CRITICAL', 'Motor shaft coupling failure',                  NOW() - INTERVAL '3 days 6 hours',  NOW() - INTERVAL '3 days 3 hours',  180,  NOW() - INTERVAL '3 days 6 hours'),
(11, 'Conveyor-D1',   'HIGH',     'Belt misalignment causing product jams',        NOW() - INTERVAL '2 days 4 hours',  NOW() - INTERVAL '2 days 3 hours',  65,   NOW() - INTERVAL '2 days 4 hours'),
(2,  'Injection-B1',  'NORMAL',   'Routine lubrication stop',                      NOW() - INTERVAL '1 day 2 hours',   NOW() - INTERVAL '1 day 1 hour',   30,   NOW() - INTERVAL '1 day 2 hours'),
(5,  'Dryer-E1',      'HIGH',     'Temperature sensor reading inconsistent',       NOW() - INTERVAL '8 hours',          NULL,                              NULL, NOW() - INTERVAL '8 hours'),
(6,  'Extruder-A1',   'CRITICAL', 'Screw seizure - emergency shutdown triggered',  NOW() - INTERVAL '4 hours',          NULL,                              NULL, NOW() - INTERVAL '4 hours');

-- 2. worker_shift_checklists
INSERT INTO worker_shift_checklists (user_id, shift_phase, tasks_json, digital_signature, created_at) VALUES
(2,  'START', '[{"task":"Check extruder temperature","done":true},{"task":"Verify raw material stock","done":true},{"task":"Inspect belt conveyors","done":true},{"task":"Test emergency stop","done":true}]', 'Worker User - 2025-01-04', NOW() - INTERVAL '6 days 8 hours'),
(5,  'END',   '[{"task":"Clean injection molds","done":true},{"task":"Log production count","done":true},{"task":"Power down auxiliary machines","done":true},{"task":"Dispose waste properly","done":false}]', 'Mohammad Esawi - 2025-01-04', NOW() - INTERVAL '6 days'),
(6,  'START', '[{"task":"Check mixer rpm","done":true},{"task":"Inspect cooling water lines","done":true},{"task":"Calibrate pressure gauges","done":true}]', 'Yazeed Esawi - 2025-01-05', NOW() - INTERVAL '5 days 8 hours'),
(8,  'END',   '[{"task":"Flush extruder barrel","done":true},{"task":"Record waste log","done":true},{"task":"Submit daily report","done":true},{"task":"Check for oil leaks","done":true}]', 'Ameen Dwikat - 2025-01-05', NOW() - INTERVAL '5 days'),
(11, 'START', '[{"task":"Verify conveyor alignment","done":true},{"task":"Check dryer humidity levels","done":false},{"task":"Inspect product quality samples","done":true}]', 'Soud Esawi - 2025-01-06', NOW() - INTERVAL '4 days 8 hours'),
(2,  'END',   '[{"task":"Shut down extruder A1","done":true},{"task":"Log micro-stop events","done":true},{"task":"Clean work area","done":true}]', 'Worker User - 2025-01-06', NOW() - INTERVAL '4 days'),
(5,  'START', '[{"task":"Load raw PVC pellets","done":true},{"task":"Check mold temperature","done":true},{"task":"Test quality samples","done":true},{"task":"Sign safety checklist","done":true}]', 'Mohammad Esawi - 2025-01-07', NOW() - INTERVAL '3 days 8 hours'),
(6,  'END',   '[{"task":"Drain mixer tank","done":true},{"task":"Record electricity readings","done":true},{"task":"Report issues to supervisor","done":true}]', 'Yazeed Esawi - 2025-01-07', NOW() - INTERVAL '3 days');

-- 3. worker_material_waste_logs
INSERT INTO worker_material_waste_logs (user_id, machine_label, machine_type, material_type, waste_kg, reason, created_at) VALUES
(2,  'Extruder-A1',  'Extruder',         'PVC Pellets',     12.5, 'Startup purge before production run',         NOW() - INTERVAL '6 days'),
(5,  'Injection-B2', 'Injection Molder', 'HDPE Granules',    8.2, 'Rejected batch due to color inconsistency',   NOW() - INTERVAL '5 days 6 hours'),
(6,  'Mixer-C1',     'Industrial Mixer', 'PVC Compound',    15.0, 'Over-mixed batch failed viscosity test',      NOW() - INTERVAL '5 days'),
(8,  'Extruder-A2',  'Extruder',         'LDPE Film',        6.3, 'Die head blockage - purged material',         NOW() - INTERVAL '4 days'),
(11, 'Conveyor-D1',  'Conveyor System',  'Finished Product', 4.8, 'Damaged pieces from belt jam incident',       NOW() - INTERVAL '3 days 8 hours'),
(2,  'Injection-B1', 'Injection Molder', 'PP Pellets',       9.1, 'Color masterbatch contamination',             NOW() - INTERVAL '3 days'),
(5,  'Dryer-E1',     'Plastic Dryer',    'PVC Pellets',      3.5, 'Overheated material - unusable',              NOW() - INTERVAL '2 days'),
(6,  'Extruder-A1',  'Extruder',         'PVC Compound',    11.0, 'Profile dimensional deviation on startup',   NOW() - INTERVAL '1 day'),
(8,  'Mixer-C1',     'Industrial Mixer', 'Stabilizer Mix',   5.7, 'Wrong formulation ratio entered',             NOW() - INTERVAL '12 hours'),
(11, 'Injection-B2', 'Injection Molder', 'HDPE Granules',    7.4, 'Flash defects on entire batch',               NOW() - INTERVAL '6 hours');

-- 4. worker_daily_targets
INSERT INTO worker_daily_targets (user_id, target_date, target_units, actual_units, note, created_at) VALUES
(2,  CURRENT_DATE - 6, 200, 195, 'Minor delay due to material loading',                 NOW() - INTERVAL '6 days'),
(5,  CURRENT_DATE - 6, 150, 162, 'Exceeded target - machine running smoothly',          NOW() - INTERVAL '6 days'),
(6,  CURRENT_DATE - 5, 180, 170, 'Mixer downtime 30 min reduced output',                NOW() - INTERVAL '5 days'),
(8,  CURRENT_DATE - 5, 220, 218, 'Near target - small quality reject batch',            NOW() - INTERVAL '5 days'),
(11, CURRENT_DATE - 4, 160, 175, 'Good day - ahead of schedule',                        NOW() - INTERVAL '4 days'),
(2,  CURRENT_DATE - 4, 200, 188, 'Critical stop on Extruder-A1 cost 1 hr',             NOW() - INTERVAL '4 days'),
(5,  CURRENT_DATE - 3, 150, 155, 'Steady production throughout shift',                  NOW() - INTERVAL '3 days'),
(6,  CURRENT_DATE - 3, 180, 165, 'Raw material replenishment delayed production',       NOW() - INTERVAL '3 days'),
(8,  CURRENT_DATE - 2, 220, 230, 'Optimized cycle time improved throughput',            NOW() - INTERVAL '2 days'),
(11, CURRENT_DATE - 2, 160, 152, 'Conveyor jam lost 45 minutes',                        NOW() - INTERVAL '2 days'),
(2,  CURRENT_DATE - 1, 200, 200, 'Exactly on target - clean shift',                     NOW() - INTERVAL '1 day'),
(5,  CURRENT_DATE - 1, 150, 143, 'Injection mold maintenance took extra time',          NOW() - INTERVAL '1 day');

-- 5. worker_kaizen_suggestions
INSERT INTO worker_kaizen_suggestions (user_id, title, details, estimated_impact, review_status, review_note, reviewed_by_id, reviewed_at, score, reward_points, created_at) VALUES
(2,  'Auto-lubrication system for Extruder-A1', 'Installing an automatic lubrication pump on Extruder-A1 would reduce manual stops from 3x/week to 1x/week and extend bearing life by an estimated 40%.', 'Reduce downtime by 3 hours/week', 'APPROVED', 'Excellent idea - purchasing team notified to source equipment.', 1, NOW() - INTERVAL '5 days', 90, 500, NOW() - INTERVAL '7 days'),
(5,  'Color-coded material storage bins', 'Using color-coded bins for PVC, HDPE, and LDPE pellets will eliminate mixing errors which cost approximately 10 kg of waste per incident.', 'Eliminate material mixing errors', 'APPROVED', 'Simple and effective - implemented in storage area.', 1, NOW() - INTERVAL '4 days', 85, 400, NOW() - INTERVAL '6 days'),
(6,  'Real-time temperature dashboard at workstation', 'A small screen showing live temperatures from all extruder zones would help operators catch overheating events 10-15 min earlier.', 'Prevent overheating stops worth 2 hr/week', 'PENDING', NULL, NULL, NULL, 75, 0, NOW() - INTERVAL '4 days'),
(8,  'Shift handover digital form', 'Replace paper handover notes with a digital form in the app to capture machine status, issues, and pending tasks. This will reduce missed information between shifts.', 'Improve shift communication efficiency', 'APPROVED', 'Aligned with our digital transformation goals - will be implemented in Q2.', 1, NOW() - INTERVAL '3 days', 88, 450, NOW() - INTERVAL '5 days'),
(11, 'Predictive maintenance schedule based on run hours', 'Track machine run hours and schedule maintenance based on hours rather than calendar days. This would prevent unexpected stops between scheduled windows.', 'Reduce unexpected stops by 60%', 'PENDING', NULL, NULL, NULL, 70, 0, NOW() - INTERVAL '3 days'),
(2,  'Waste sorting station near production floor', 'A dedicated sorting station close to each machine line would reduce walking time for waste disposal from 5 min to 1 min per disposal event.', 'Save 20 min/worker/day', 'REJECTED', 'Space constraints on production floor prevent this. Will revisit in new facility layout.', 1, NOW() - INTERVAL '2 days', 60, 100, NOW() - INTERVAL '4 days'),
(5,  'Weekly machine cleaning log visible to all workers', 'A shared cleaning log posted at each machine will create accountability and ensure no machine goes more than 3 days without proper cleaning.', 'Improve machine hygiene and longevity', 'PENDING', NULL, NULL, NULL, 65, 0, NOW() - INTERVAL '2 days'),
(6,  'Emergency stop button repositioning on Injection-B2', 'Current placement of e-stop requires operator to reach across machine body. Moving it to near the control panel reduces response time from 8s to 2s.', 'Improve safety response time by 75%', 'APPROVED', 'Safety improvement approved. Maintenance team will relocate button this weekend.', 1, NOW() - INTERVAL '1 day', 95, 600, NOW() - INTERVAL '3 days');

-- 6. worker_quality_issue_reports
INSERT INTO worker_quality_issue_reports (user_id, batch_code, machine_label, issue_type, details, issue_image, created_at) VALUES
(2,  'BATCH-2025-0101', 'Extruder-A1',  'Dimensional Deviation', 'Profile width 2.3mm over spec (18.3mm vs 16mm target). Entire run of 500 pieces affected.', NULL, NOW() - INTERVAL '6 days'),
(5,  'BATCH-2025-0102', 'Injection-B2', 'Surface Defects',        'Sink marks on product face at gate area. Approx 15% of batch (75 pieces) affected.', NULL, NOW() - INTERVAL '5 days 6 hours'),
(6,  'BATCH-2025-0103', 'Mixer-C1',     'Color Inconsistency',    'Batch showing grey streaks throughout due to uneven masterbatch distribution.', NULL, NOW() - INTERVAL '5 days'),
(8,  'BATCH-2025-0104', 'Extruder-A2',  'Void Formation',         'Internal voids detected on cross-section cuts. Root cause: moisture in LDPE pellets.', NULL, NOW() - INTERVAL '4 days'),
(11, 'BATCH-2025-0105', 'Conveyor-D1',  'Physical Damage',        'Cracked edges on 23 finished pieces from belt jam incident. Pieces quarantined for inspection.', NULL, NOW() - INTERVAL '3 days 8 hours'),
(2,  'BATCH-2025-0106', 'Injection-B1', 'Flash Defects',          'Excess flash around mold parting line on all pieces. Mold worn - needs regrinding.', NULL, NOW() - INTERVAL '3 days'),
(5,  'BATCH-2025-0107', 'Extruder-A1',  'Warping',                'Products warping after cooling. Cooling channel flow rate reduced - corrected during shift.', NULL, NOW() - INTERVAL '2 days'),
(6,  'BATCH-2025-0108', 'Injection-B2', 'Short Shot',             'Incomplete fill on 40 cavities. Injection pressure dropped - barrel temperature adjusted.', NULL, NOW() - INTERVAL '1 day'),
(8,  'BATCH-2025-0109', 'Mixer-C1',     'Contamination',          'Foreign material (metal shavings) found in mixed batch. Production halted for investigation.', NULL, NOW() - INTERVAL '12 hours'),
(11, 'BATCH-2025-0110', 'Extruder-A2',  'Dimensional Deviation',  'Wall thickness 0.8mm below minimum spec. Batch scrapped. Screw wear suspected.', NULL, NOW() - INTERVAL '6 hours');

-- 7. worker_micro_stops
INSERT INTO worker_micro_stops (user_id, machine_label, reason, duration_minutes, created_at) VALUES
(2,  'Extruder-A1',  'Material hopper empty - refill required',         8,  NOW() - INTERVAL '6 days 7 hours'),
(5,  'Injection-B2', 'Product stuck in mold - manual ejection needed',  5,  NOW() - INTERVAL '6 days 5 hours'),
(6,  'Mixer-C1',     'Speed controller glitch - reset required',       12,  NOW() - INTERVAL '5 days 6 hours'),
(8,  'Extruder-A2',  'Clogged die head - cleaned manually',            18,  NOW() - INTERVAL '5 days 4 hours'),
(11, 'Conveyor-D1',  'Product fallen off belt - repositioned',          4,  NOW() - INTERVAL '4 days 5 hours'),
(2,  'Injection-B1', 'Operator break - no coverage',                   15,  NOW() - INTERVAL '4 days 3 hours'),
(5,  'Dryer-E1',     'Humidity sensor alarm - investigated and cleared', 7,  NOW() - INTERVAL '3 days 6 hours'),
(6,  'Extruder-A1',  'Screen pack changed - routine',                  22,  NOW() - INTERVAL '3 days 4 hours'),
(8,  'Mixer-C1',     'Material addition delayed - waiting on forklift', 9,  NOW() - INTERVAL '2 days 5 hours'),
(11, 'Injection-B2', 'Mold cooling water flow blocked - cleared',      13,  NOW() - INTERVAL '2 days 3 hours'),
(2,  'Extruder-A2',  'Power fluctuation caused brief stop',             3,  NOW() - INTERVAL '1 day 6 hours'),
(5,  'Conveyor-D1',  'Product jam at transfer point',                   6,  NOW() - INTERVAL '1 day 4 hours'),
(6,  'Injection-B1', 'Nozzle drool clean-up',                         10,  NOW() - INTERVAL '8 hours'),
(8,  'Extruder-A1',  'Emergency stop accidentally triggered - reset',   5,  NOW() - INTERVAL '5 hours'),
(11, 'Dryer-E1',     'Temperature overshoot alarm - cooling period',   20,  NOW() - INTERVAL '3 hours');

-- 8. worker_electricity_anomaly_alerts
INSERT INTO worker_electricity_anomaly_alerts (user_id, machine_label, current_kwh, baseline_kwh, threshold_ratio, severity, message, created_at) VALUES
(2,  'Extruder-A1',  45.2, 32.0, 1.41, 'HIGH',     'Extruder-A1 drawing 41% above baseline - possible heater element fault.',        NOW() - INTERVAL '6 days 2 hours'),
(5,  'Injection-B2', 28.7, 25.0, 1.15, 'MEDIUM',   'Injection-B2 slightly elevated - monitor hydraulic pump efficiency.',             NOW() - INTERVAL '5 days 8 hours'),
(6,  'Mixer-C1',     52.1, 38.5, 1.35, 'HIGH',     'Mixer-C1 consuming 35% excess energy - check motor bearings and belt tension.',  NOW() - INTERVAL '5 days 3 hours'),
(8,  'Extruder-A2',  18.3, 20.0, 0.92, 'LOW',      'Extruder-A2 below baseline - machine running under capacity.',                   NOW() - INTERVAL '4 days 6 hours'),
(11, 'Conveyor-D1',  12.8,  9.5, 1.35, 'HIGH',     'Conveyor-D1 drawing 35% above baseline - belt tension too high or jam forming.', NOW() - INTERVAL '4 days 2 hours'),
(2,  'Injection-B1', 31.5, 25.0, 1.26, 'MEDIUM',   'Injection-B1 elevated consumption - barrel insulation may need inspection.',     NOW() - INTERVAL '3 days 5 hours'),
(5,  'Dryer-E1',     65.8, 40.0, 1.64, 'CRITICAL', 'CRITICAL: Dryer-E1 consuming 64% above baseline - heating element may be shorted.', NOW() - INTERVAL '3 days 1 hour'),
(6,  'Extruder-A1',  48.9, 32.0, 1.53, 'CRITICAL', 'CRITICAL: Extruder-A1 at 53% above baseline - screw seizure risk. Inspect immediately.', NOW() - INTERVAL '2 days 4 hours'),
(8,  'Mixer-C1',     41.2, 38.5, 1.07, 'LOW',      'Mixer-C1 slightly above baseline - within acceptable range.',                    NOW() - INTERVAL '2 days 1 hour'),
(11, 'Extruder-A2',  55.0, 20.0, 2.75, 'CRITICAL', 'CRITICAL: Extruder-A2 running at 175% above baseline - possible short circuit.',  NOW() - INTERVAL '1 day 3 hours'),
(2,  'Injection-B2', 27.3, 25.0, 1.09, 'LOW',      'Minor deviation on Injection-B2 - possibly due to cold startup conditions.',     NOW() - INTERVAL '1 day 1 hour'),
(5,  'Conveyor-D1',  11.2,  9.5, 1.18, 'MEDIUM',   'Conveyor-D1 elevated - check motor brushes and drive rollers.',                  NOW() - INTERVAL '10 hours');
