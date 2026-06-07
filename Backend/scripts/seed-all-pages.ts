import "dotenv/config";
import { prisma } from "../src/config/lib/prisma";

const ADMIN = 1, ACCOUNTANT = 4;
const WORKERS = [2, 5, 6, 8, 11];
const ENGINEERS = [3, 7, 9, 10, 12, 13];
const ALL_USERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const KWH_ID = 1;
const HDPE = 1, LDPE = 2, PET = 3, ADHESIVE = 4, EMPTY_BAGS = 5, COLOR = 6, PREFORM_MAT = 7, CAPS_MAT = 8;

const TODAY = new Date(2026, 5, 7); // June 7, 2026

function d(daysAgo: number, h = 8): Date {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(h, 0, 0, 0);
  return dt;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(a: number, b: number): number { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rf(a: number, b: number): number { return Math.round((Math.random() * (b - a) + a) * 100) / 100; }

async function main() {
  console.log("🌱 Seeding all-pages factory data...\n");

  // ── 1. ATTENDANCE ──────────────────────────────────────────────
  const attCount = await prisma.attendance.count();
  if (attCount < 100) {
    const rows: any[] = [];
    const userShiftMap: [number, number, number, number][] = [
      // [userId, shiftId, checkInHour, checkOutHour]
      [2, 1, 7, 15], [8, 1, 7, 15],
      [5, 2, 15, 23], [6, 2, 15, 23],
      [11, 3, 23, 7],
      [7, 1, 7, 15], [12, 1, 7, 15],
      [3, 2, 15, 23], [9, 2, 15, 23], [13, 2, 15, 23],
      [10, 3, 23, 7],
    ];
    for (let day = 1; day <= 30; day++) {
      const base = new Date(TODAY); base.setDate(base.getDate() - day);
      if (base.getDay() === 5) continue;
      for (const [userId, shiftId, inH, outH] of userShiftMap) {
        const late = rand(0, 8) < 2 ? rand(5, 25) : 0;
        const checkIn = new Date(base); checkIn.setHours(inH, late, 0, 0);
        const checkOut = new Date(base);
        if (shiftId === 3) { checkOut.setDate(checkOut.getDate() + 1); checkOut.setHours(outH, 0, 0, 0); }
        else checkOut.setHours(outH, 0, 0, 0);
        rows.push({ userId, shiftId, checkIn, checkOut, lateMinutes: late, overtimeMinutes: rand(0, 8) < 3 ? rand(30, 90) : 0 });
      }
      for (const userId of [ADMIN, ACCOUNTANT]) {
        const ci = new Date(base); ci.setHours(8, rand(0, 15), 0, 0);
        const co = new Date(base); co.setHours(17, rand(0, 30), 0, 0);
        rows.push({ userId, shiftId: null, checkIn: ci, checkOut: co, lateMinutes: 0, overtimeMinutes: 0 });
      }
    }
    await prisma.attendance.createMany({ data: rows });
    console.log(`✅ Attendance: ${rows.length} records`);
  } else console.log(`⏭️  Attendance: ${attCount} exist`);

  // ── 2. DAILY PAYROLL ──────────────────────────────────────────
  const dpCount = await prisma.dailyPayroll.count();
  if (dpCount < 50) {
    const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, role: true } });
    const salMap: Record<string, number> = { WORKER: 3200, ENGINEER: 6500, ACCOUNTANT: 5800, ADMIN: 9500 };
    const rows: any[] = [];
    for (let day = 1; day <= 20; day++) {
      const base = new Date(TODAY); base.setDate(base.getDate() - day);
      if (base.getDay() === 5) continue;
      for (const u of users) {
        const daily = (salMap[u.role] ?? 3500) / 26;
        const hrs = rf(7.5, 8.5);
        const ded = rand(0, 6) < 1 ? rf(20, 50) : 0;
        rows.push({ userId: u.id, date: base, hoursWorked: hrs, dailyRate: rf(daily * 0.95, daily * 1.05), totalDailyPay: rf(daily - ded, daily + 20), deductionAmount: ded, isConfirmed: day > 3, confirmedById: day > 3 ? ADMIN : null, confirmedAt: day > 3 ? d(day - 1) : null });
      }
    }
    await prisma.dailyPayroll.createMany({ data: rows });
    console.log(`✅ Daily Payroll: ${rows.length} records`);
  } else console.log(`⏭️  Daily Payroll: ${dpCount} exist`);

  // ── 3. PRODUCTION RECORDS ─────────────────────────────────────
  const prodCount = await prisma.productionRecord.count();
  if (prodCount < 50) {
    const rows: any[] = [];
    // [machineId, userId, shiftId, isCaps]
    const lines: [number, number, number, boolean][] = [
      [1, 2, 1, true], [1, 5, 2, true], [1, 11, 3, true],
      [2, 8, 1, false], [2, 6, 2, false],
      [3, 8, 1, true], [3, 5, 2, true],
      [5, 2, 1, true],
    ];
    const slots = ["07:00-15:00", "15:00-23:00", "23:00-07:00"];
    for (let day = 1; day <= 20; day++) {
      const date = new Date(TODAY); date.setDate(date.getDate() - day);
      if (date.getDay() === 5) continue;
      for (const [machineId, userId, shiftId, isCaps] of lines) {
        const cartons = rand(160, 280);
        const ppc = isCaps ? 1000 : 500;
        const total = cartons * ppc;
        const damaged = rand(50, 300);
        rows.push({
          machineId, userId, shiftId, date,
          hourSlot: slots[shiftId - 1],
          cartonsCount: cartons, piecesPerCarton: ppc, totalPieces: total,
          workingCavities: isCaps ? 48 : 96,
          rawHdpeUsed: isCaps ? rf(150, 220) : null,
          rawPetUsed: isCaps ? null : rf(120, 180),
          adhesiveUsed: isCaps ? rf(5, 15) : null,
          colorUsed: isCaps ? rf(2, 8) : null,
          damagedPieces: damaged, netGoodPieces: total - damaged,
          capColor: isCaps ? pick(["أبيض", "أزرق", "أحمر", "أخضر", "أصفر"]) : null,
          downtimeMinutes: rand(0, 6) < 1 ? rand(15, 60) : null,
        });
      }
    }
    await prisma.productionRecord.createMany({ data: rows });
    console.log(`✅ Production Records: ${rows.length}`);
  } else console.log(`⏭️  Production: ${prodCount} exist`);

  // ── 4. ELECTRICITY READINGS ───────────────────────────────────
  const elecCount = await prisma.electricityReading.count();
  if (elecCount < 50) {
    const rows: any[] = [];
    let meter = 85000;
    for (let day = 30; day >= 1; day--) {
      const date = new Date(TODAY); date.setDate(date.getDate() - day);
      if (date.getDay() === 5) continue;
      const shiftDef: [number, number, number][] = [[1, 7, 7], [2, 9, 9], [3, 10, 10]];
      for (const [shiftId, recId, engId] of shiftDef) {
        const cons = rf(450, 750);
        const end = meter + cons;
        rows.push({ date, shiftId, startReading: meter, endReading: end, consumption: cons, kwhPriceId: KWH_ID, kwhPriceSnap: 0.62, shiftCost: rf(cons * 0.6, cons * 0.65), recordedById: recId, responsibleEngineerId: engId, isMeterReset: false });
        meter = Math.round(end * 100) / 100;
      }
    }
    await prisma.electricityReading.createMany({ data: rows });
    console.log(`✅ Electricity Readings: ${rows.length}`);
  } else console.log(`⏭️  Electricity: ${elecCount} exist`);

  // ── 5. MACHINE READINGS ───────────────────────────────────────
  const mrCount = await prisma.machineReading.count();
  if (mrCount < 10) {
    const rows: any[] = [];
    let c1 = 4500000, c2 = 2800000;
    for (let day = 14; day >= 1; day--) {
      const date = new Date(TODAY); date.setDate(date.getDate() - day);
      if (date.getDay() === 5) continue;
      const p1 = rand(85000, 95000);
      rows.push({ machineId: 1, userId: 7, shiftId: 1, startCounter: c1, endCounter: c1 + p1, recordedAt: date }); c1 += p1;
      const p2 = rand(25000, 30000);
      rows.push({ machineId: 2, userId: 9, shiftId: 2, startCounter: c2, endCounter: c2 + p2, recordedAt: date }); c2 += p2;
    }
    await prisma.machineReading.createMany({ data: rows });
    console.log(`✅ Machine Readings: ${rows.length}`);
  } else console.log(`⏭️  Machine Readings: ${mrCount} exist`);

  // ── 6. QUALITY CHECKS ─────────────────────────────────────────
  const qcCount = await prisma.qualityCheck.count();
  if (qcCount < 10) {
    const issues = ["DIMENSIONAL", "SURFACE_DEFECT", "MATERIAL_FAULT", "COLOR_VARIATION", "WEIGHT_DEVIATION"];
    const sevs = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const descs = ["تجاوز في الأبعاد المسموح بها", "عيب سطحي على الغطاء", "خلل في تجانس المادة", "اختلاف اللون عن المعيار", "انحراف في وزن القطعة"];
    const rows = Array.from({ length: 20 }, (_, i) => ({
      machineId: pick([1, 2, 3, 4, 5]),
      engineerId: pick(ENGINEERS),
      shiftId: pick([1, 2, 3]),
      issueType: pick(issues),
      severity: pick(sevs),
      description: pick(descs),
      resolvedAt: rand(0, 2) > 0 ? d(rand(0, 5)) : null,
      createdAt: d(rand(1, 14)),
    }));
    await prisma.qualityCheck.createMany({ data: rows });
    console.log(`✅ Quality Checks: 20`);
  } else console.log(`⏭️  Quality: ${qcCount} exist`);

  // ── 7. MAINTENANCE + COSTS ────────────────────────────────────
  const maintCount = await prisma.maintenance.count();
  if (maintCount < 5) {
    const defs = [
      { machineId: 1, engineerId: 7,  shiftId: 1, partsUsed: "بكرة ناقل حركة، زيت تشحيم",      downtimeMinutes: 45, downtimeReason: "BELT_FAILURE" as any,          reportText: "استبدال بكرة ناقل الحركة وإضافة زيت التشحيم", createdAt: d(25) },
      { machineId: 2, engineerId: 9,  shiftId: 2, partsUsed: "حلقات ختم، فلتر هواء",            downtimeMinutes: 30, downtimeReason: "SEAL_LEAK" as any,             reportText: "تغيير حلقات الختم الهيدروليكي وفلتر الهواء", createdAt: d(20) },
      { machineId: 3, engineerId: 12, shiftId: 1, partsUsed: "مسامير قوالب HDPE",               downtimeMinutes: 20, downtimeReason: "SCHEDULED_MAINTENANCE" as any, reportText: "صيانة دورية شهرية - شد المسامير وفحص القوالب", createdAt: d(18) },
      { machineId: 1, engineerId: 7,  shiftId: 1, partsUsed: "حساس درجة حرارة PT100",           downtimeMinutes: 60, downtimeReason: "SENSOR_MALFUNCTION" as any,     reportText: "تعطل حساس الحرارة - تم الاستبدال", createdAt: d(15) },
      { machineId: 4, engineerId: 13, shiftId: 2, partsUsed: "زيت هيدروليكي، فلتر",             downtimeMinutes: 40, downtimeReason: "HYDRAULIC_FAILURE" as any,      reportText: "تسرب في الجهاز الهيدروليكي - تم إصلاحه", createdAt: d(12) },
      { machineId: 5, engineerId: 3,  shiftId: 2, partsUsed: "قطع غيار كهربائية",               downtimeMinutes: 55, downtimeReason: "ELECTRICAL" as any,             reportText: "عطل كهربائي في لوحة التحكم", createdAt: d(10) },
      { machineId: 2, engineerId: 9,  shiftId: 2, partsUsed: "فلتر هواء، زيت تشحيم",            downtimeMinutes: 25, downtimeReason: "SCHEDULED_MAINTENANCE" as any, reportText: "صيانة أسبوعية مجدولة", createdAt: d(7) },
      { machineId: 6, engineerId: 10, shiftId: 3, partsUsed: "حساس ضغط، مقياس درجة حرارة",      downtimeMinutes: 35, downtimeReason: "SENSOR_MALFUNCTION" as any,     reportText: "استبدال حساسات المراقبة في آلة النفخ", createdAt: d(5) },
      { machineId: 1, engineerId: 12, shiftId: 1, partsUsed: "بكرة ناقل، مسامير",               downtimeMinutes: 20, downtimeReason: "SCHEDULED_MAINTENANCE" as any, reportText: "صيانة دورية أسبوعية منتظمة", createdAt: d(3) },
      { machineId: 3, engineerId: 7,  shiftId: 1, partsUsed: "مادة تشحيم، قطع غيار صغيرة",     downtimeMinutes: 15, downtimeReason: "OTHER" as any,                  reportText: "فحص وتشحيم دوري", createdAt: d(1) },
    ];
    for (const m of defs) {
      const rec = await prisma.maintenance.create({ data: m });
      await prisma.maintenanceCost.create({ data: { maintenanceId: rec.id, laborHours: rf(2, 6), laborCostPerHour: 45, sparesTotal: rf(100, 800), laborTotal: rf(90, 270), totalCost: rf(200, 1100), notes: "تكاليف فعلية", createdById: ADMIN } });
    }
    console.log(`✅ Maintenance + Costs: ${defs.length} each`);
  } else console.log(`⏭️  Maintenance: ${maintCount} exist`);

  // ── 8. MAINTENANCE SCHEDULES ──────────────────────────────────
  const schedCount = await prisma.maintenanceSchedule.count();
  if (schedCount < 5) {
    await prisma.maintenanceSchedule.createMany({ data: [
      { machineId: 1, assignedEngineerId: 7,  createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "WEEKLY",    lastScheduledDate: d(7),  nextScheduledDate: d(-7),  status: "PENDING",     description: "صيانة أسبوعية لخط كابس 1" },
      { machineId: 2, assignedEngineerId: 9,  createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "MONTHLY",   lastScheduledDate: d(30), nextScheduledDate: d(-5),  status: "PENDING",     description: "صيانة شهرية لخط بريفورم 1" },
      { machineId: 3, assignedEngineerId: 12, createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "WEEKLY",    lastScheduledDate: d(7),  nextScheduledDate: d(-7),  status: "PENDING",     description: "صيانة أسبوعية لخط كابس 2" },
      { machineId: 4, assignedEngineerId: 13, createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "MONTHLY",   lastScheduledDate: d(30), nextScheduledDate: d(-5),  status: "PENDING",     description: "صيانة شهرية لخط بريفورم 2" },
      { machineId: 5, assignedEngineerId: 3,  createdById: ADMIN, scheduleType: "CORRECTIVE", frequency: "QUARTERLY", lastScheduledDate: d(90), nextScheduledDate: d(-30), status: "OVERDUE",     description: "صيانة ربع سنوية لخط كابس رياضي" },
      { machineId: 6, assignedEngineerId: 10, createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "MONTHLY",   lastScheduledDate: d(5),  nextScheduledDate: d(-25), status: "COMPLETED",   description: "فحص آلة النفخ الشهري" },
      { machineId: 7, assignedEngineerId: 7,  createdById: ADMIN, scheduleType: "CORRECTIVE", frequency: "WEEKLY",    lastScheduledDate: d(14), nextScheduledDate: d(-7),  status: "IN_PROGRESS", description: "صيانة آلة الحقن - قيد التنفيذ" },
      { machineId: 8, assignedEngineerId: 9,  createdById: ADMIN, scheduleType: "PREVENTIVE", frequency: "QUARTERLY", lastScheduledDate: d(90), nextScheduledDate: d(-90), status: "PENDING",     description: "فحص الضاغط الرئيسي ربع سنوي" },
    ]});
    console.log("✅ Maintenance Schedules: 8");
  } else console.log(`⏭️  Schedules: ${schedCount} exist`);

  // ── 9. MACHINE HEALTH RECORDS ─────────────────────────────────
  const healthCount = await prisma.machineHealthRecord.count();
  if (healthCount < 10) {
    const rows: any[] = [];
    for (let w = 0; w < 6; w++) {
      for (const machineId of [1, 2, 3, 4, 5, 6, 7, 8]) {
        rows.push({ machineId, recordedById: pick(ENGINEERS), operationalStatus: machineId === 7 ? "MAINTENANCE" : pick(["OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "MAINTENANCE"]), downtimePercentage: rf(0, 6), maintenanceHours: rand(0, 4), efficiencyRating: machineId === 7 ? rand(0, 20) : rand(82, 99), notes: `تقرير صحة أسبوعي - الأسبوع ${w + 1}`, recordedAt: d(w * 7 + rand(0, 5)) });
      }
    }
    await prisma.machineHealthRecord.createMany({ data: rows });
    console.log(`✅ Machine Health Records: ${rows.length}`);
  } else console.log(`⏭️  Health: ${healthCount} exist`);

  // ── 10. SPARE PART REQUESTS ───────────────────────────────────
  const spReqCount = await prisma.sparePartRequest.count();
  if (spReqCount < 5) {
    await prisma.sparePartRequest.createMany({ data: [
      { engineerId: 7,  machineId: 1, partName: "بكرة ناقل حركة CCM48",        quantity: 2,  status: "RECEIVED", unitPrice: 380,  pricedById: ACCOUNTANT, supplierName: "SACMI Italy",            supplierCountry: "Italy",     notes: "مستعجل",                          createdAt: d(20) },
      { engineerId: 9,  machineId: 2, partName: "حلقات ختم هيدروليكي HPP5",   quantity: 4,  status: "RECEIVED", unitPrice: 650,  pricedById: ACCOUNTANT, supplierName: "Husky Injection Molding", supplierCountry: "Canada",    notes: "",                                createdAt: d(18) },
      { engineerId: 12, machineId: 3, partName: "فلتر هواء مضغوط",             quantity: 6,  status: "PENDING",                                                                                          notes: "تغيير شهري",                       createdAt: d(10) },
      { engineerId: 13, machineId: 4, partName: "حساس درجة حرارة PT100",       quantity: 3,  status: "PENDING",                                                                                          notes: "لا يتوفر محلياً",                  createdAt: d(8)  },
      { engineerId: 3,  machineId: 5, partName: "مسامير قوالب M8x25",          quantity: 48, status: "RECEIVED", unitPrice: 85,   pricedById: ACCOUNTANT, supplierName: "شركة البيك",             supplierCountry: "Palestine", notes: "",                                createdAt: d(15) },
      { engineerId: 10, machineId: 6, partName: "حساس ضغط هواء",               quantity: 2,  status: "PENDING",                                                                                          notes: "طلب عاجل - توقف الإنتاج",         createdAt: d(3)  },
      { engineerId: 7,  machineId: 1, partName: "زيت تشحيم ISO VG 46 (20 لتر)",quantity: 20, status: "RECEIVED", unitPrice: 18,   pricedById: ACCOUNTANT, supplierName: "شركة البيك",             supplierCountry: "Palestine", notes: "",                                createdAt: d(25) },
    ]});
    console.log("✅ Spare Part Requests: 7");
  } else console.log(`⏭️  Spare Part Requests: ${spReqCount} exist`);

  // ── 11. RAW MATERIAL ALERTS ───────────────────────────────────
  const alertCount = await prisma.rawMaterialAlert.count();
  if (alertCount < 3) {
    await prisma.rawMaterialAlert.createMany({ data: [
      { materialId: HDPE,       minQuantity: 2000, isActive: true },
      { materialId: PET,        minQuantity: 3000, isActive: true },
      { materialId: LDPE,       minQuantity: 800,  isActive: true },
      { materialId: COLOR,      minQuantity: 50,   isActive: true },
      { materialId: PREFORM_MAT,minQuantity: 5000, isActive: true },
    ]});
    console.log("✅ Raw Material Alerts: 5");
  } else console.log(`⏭️  Alerts: ${alertCount} exist`);

  // ── 12. PURCHASES + INVENTORY IN ─────────────────────────────
  const purchCount = await prisma.purchase.count();
  if (purchCount < 5) {
    const defs = [
      { sup: 3, mat: HDPE,       qty: 10000, price: 8.5,  total: 85000,  day: 55 },
      { sup: 4, mat: PET,        qty: 18000, price: 9.5,  total: 171000, day: 50 },
      { sup: 5, mat: LDPE,       qty: 4200,  price: 7.2,  total: 30240,  day: 45 },
      { sup: 6, mat: 9,          qty: 6800,  price: 7.0,  total: 47600,  day: 40 },
      { sup: 7, mat: COLOR,      qty: 440,   price: 45.0, total: 19800,  day: 38 },
      { sup: 3, mat: HDPE,       qty: 5000,  price: 8.5,  total: 42500,  day: 30 },
      { sup: 4, mat: PET,        qty: 9500,  price: 9.5,  total: 90250,  day: 25 },
      { sup: 5, mat: ADHESIVE,   qty: 800,   price: 26.0, total: 20800,  day: 20 },
      { sup: 7, mat: EMPTY_BAGS, qty: 16000, price: 1.24, total: 19840,  day: 15 },
      { sup: 6, mat: 9,          qty: 3000,  price: 7.6,  total: 22800,  day: 10 },
    ];
    for (const p of defs) {
      const rec = await prisma.purchase.create({ data: { supplierId: p.sup, receivedById: ADMIN, totalAmount: p.total, invoiceImage: "placeholder/invoice.pdf", date: d(p.day), items: { create: [{ materialId: p.mat, quantity: p.qty, pricePerUnit: p.price }] } } });
      await prisma.inventoryTransaction.create({ data: { materialId: p.mat, type: "IN", quantity: p.qty, referenceType: "PURCHASE", referenceId: rec.id, createdById: ADMIN } });
    }
    console.log("✅ Purchases + Inventory IN: 10");
  } else console.log(`⏭️  Purchases: ${purchCount} exist`);

  // ── 13. SALES + INVENTORY OUT ─────────────────────────────────
  const saleCount = await prisma.sale.count();
  if (saleCount < 5) {
    const defs = [
      { cust: 8,  total: 45000, day: 52, type: "CAPS",    size: "28mm",     qty: 500000, ppu: 0.09  },
      { cust: 9,  total: 28000, day: 48, type: "PREFORM", size: "PCO-1881", qty: 50000,  ppu: 0.56  },
      { cust: 10, total: 36500, day: 42, type: "CAPS",    size: "38mm",     qty: 400000, ppu: 0.091 },
      { cust: 11, total: 52000, day: 38, type: "CAPS",    size: "28mm",     qty: 600000, ppu: 0.087 },
      { cust: 12, total: 19500, day: 35, type: "PREFORM", size: "30g",      qty: 35000,  ppu: 0.557 },
      { cust: 8,  total: 40000, day: 28, type: "CAPS",    size: "28mm",     qty: 450000, ppu: 0.089 },
      { cust: 9,  total: 31500, day: 22, type: "PREFORM", size: "PCO-1881", qty: 55000,  ppu: 0.573 },
      { cust: 10, total: 25000, day: 18, type: "CAPS",    size: "38mm",     qty: 280000, ppu: 0.089 },
      { cust: 11, total: 48000, day: 12, type: "CAPS",    size: "28mm",     qty: 550000, ppu: 0.087 },
      { cust: 12, total: 22000, day: 8,  type: "PREFORM", size: "30g",      qty: 40000,  ppu: 0.55  },
      { cust: 8,  total: 35000, day: 5,  type: "CAPS",    size: "28mm",     qty: 400000, ppu: 0.088 },
      { cust: 9,  total: 27000, day: 2,  type: "PREFORM", size: "PCO-1881", qty: 48000,  ppu: 0.563 },
    ];
    for (const s of defs) {
      const rec = await prisma.sale.create({ data: { customerId: s.cust, soldById: ADMIN, totalAmount: s.total, invoiceImage: "placeholder/invoice.pdf", date: d(s.day), items: { create: [{ machineType: s.type, size: s.size, quantity: s.qty, pricePerUnit: s.ppu }] } } });
      const matId = s.type === "CAPS" ? CAPS_MAT : PREFORM_MAT;
      await prisma.inventoryTransaction.create({ data: { materialId: matId, type: "OUT", quantity: s.qty / 1000, referenceType: "SALE", referenceId: rec.id, createdById: ADMIN } });
    }
    console.log("✅ Sales + Inventory OUT: 12");
  } else console.log(`⏭️  Sales: ${saleCount} exist`);

  // ── 14. INVOICES ──────────────────────────────────────────────
  const invCount = await prisma.invoice.count();
  if (invCount < 5) {
    const existing = new Set((await prisma.invoice.findMany({ select: { invoiceNumber: true } })).map(i => i.invoiceNumber));
    const defs = [
      { cust: 8,  num: "PLT-2026-001", total: 45000, due: d(-30), status: "PAID",    issue: d(55) },
      { cust: 9,  num: "PLT-2026-002", total: 28000, due: d(-18), status: "PAID",    issue: d(48) },
      { cust: 10, num: "PLT-2026-003", total: 36500, due: d(-12), status: "PAID",    issue: d(42) },
      { cust: 11, num: "PLT-2026-004", total: 52000, due: d(-8),  status: "PAID",    issue: d(38) },
      { cust: 12, num: "PLT-2026-005", total: 19500, due: d(-5),  status: "PAID",    issue: d(35) },
      { cust: 8,  num: "PLT-2026-006", total: 40000, due: d(-2),  status: "OVERDUE", issue: d(28) },
      { cust: 9,  num: "PLT-2026-007", total: 31500, due: d(8),   status: "PENDING", issue: d(22) },
      { cust: 10, num: "PLT-2026-008", total: 25000, due: d(12),  status: "PENDING", issue: d(18) },
      { cust: 11, num: "PLT-2026-009", total: 48000, due: d(15),  status: "PENDING", issue: d(12) },
      { cust: 12, num: "PLT-2026-010", total: 22000, due: d(18),  status: "PENDING", issue: d(8)  },
      { cust: 8,  num: "PLT-2026-011", total: 35000, due: d(25),  status: "PENDING", issue: d(5)  },
      { cust: 9,  num: "PLT-2026-012", total: 27000, due: d(30),  status: "PENDING", issue: d(2)  },
    ];
    const toCreate = defs.filter(x => !existing.has(x.num));
    if (toCreate.length > 0) {
      await prisma.invoice.createMany({ data: toCreate.map(x => ({ customerId: x.cust, invoiceNumber: x.num, totalAmount: x.total, dueDate: x.due, paymentStatus: x.status, issueDate: x.issue, createdById: ACCOUNTANT, currency: "NIS", vendorName: "بلاستيكون للصناعات البلاستيكية", vendorPhone: "+970-2-2980000", vendorEmail: "info@plasticon.ps" })) });
    }
    console.log(`✅ Invoices: ${toCreate.length} created`);
  } else console.log(`⏭️  Invoices: ${invCount} exist`);

  // ── 15. EXPENSES ──────────────────────────────────────────────
  const expCount = await prisma.expense.count();
  if (expCount < 10) {
    await prisma.expense.createMany({ data: [
      { submittedById: ADMIN, category: "UTILITIES",   amount: 18600, description: "فاتورة كهرباء مايو 2026",         paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(34), submittedAt: d(35) },
      { submittedById: ADMIN, category: "MAINTENANCE",  amount: 4500,  description: "قطع غيار صيانة شهرية",           paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(31), submittedAt: d(32) },
      { submittedById: ADMIN, category: "MATERIALS",    amount: 12000, description: "مواد تعبئة وتغليف",              paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(27), submittedAt: d(28) },
      { submittedById: ADMIN, category: "OTHER",        amount: 2800,  description: "مصاريف إدارية وقرطاسية",         paymentStatus: "APPROVED", submittedAt: d(25) },
      { submittedById: ADMIN, category: "MAINTENANCE",  amount: 8200,  description: "إصلاح عطل آلة الحقن",            paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(21), submittedAt: d(22) },
      { submittedById: ADMIN, category: "UTILITIES",    amount: 3200,  description: "فاتورة مياه شهر مايو",           paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(19), submittedAt: d(20) },
      { submittedById: ADMIN, category: "OTHER",        amount: 5500,  description: "تأمين معدات المصنع",             paymentStatus: "APPROVED", submittedAt: d(18) },
      { submittedById: ADMIN, category: "MAINTENANCE",  amount: 3800,  description: "قطع غيار أسبوعية",              paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(13), submittedAt: d(14) },
      { submittedById: ADMIN, category: "UTILITIES",    amount: 16800, description: "فاتورة كهرباء أبريل 2026",       paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(64), submittedAt: d(65) },
      { submittedById: ADMIN, category: "MATERIALS",    amount: 9500,  description: "مواد خام إضافية",               paymentStatus: "PAID",     approvedById: ACCOUNTANT, approvedAt: d(9),  submittedAt: d(10) },
      { submittedById: ADMIN, category: "OTHER",        amount: 4200,  description: "نفقات سفر وتدريب موظفين",        paymentStatus: "PENDING",  submittedAt: d(7) },
      { submittedById: ADMIN, category: "MAINTENANCE",  amount: 6100,  description: "صيانة نظام التبريد",            paymentStatus: "PENDING",  submittedAt: d(5) },
      { submittedById: ADMIN, category: "UTILITIES",    amount: 1800,  description: "خدمات إنترنت وهاتف",            paymentStatus: "APPROVED", submittedAt: d(3) },
      { submittedById: ADMIN, category: "MATERIALS",    amount: 7800,  description: "مستلزمات مختبر الجودة",         paymentStatus: "PENDING",  submittedAt: d(1) },
    ]});
    console.log("✅ Expenses: 14");
  } else console.log(`⏭️  Expenses: ${expCount} exist`);

  // ── 16. MONTHLY PAYROLL ───────────────────────────────────────
  const payrollCount = await prisma.payroll.count();
  if (payrollCount < 10) {
    const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, role: true } });
    const salMap: Record<string, number> = { WORKER: 3200, ENGINEER: 6500, ACCOUNTANT: 5800, ADMIN: 9500 };
    const rows: any[] = [];
    for (const month of ["2026-03", "2026-04", "2026-05"]) {
      for (const u of users) {
        const base = salMap[u.role] ?? 3500;
        const ot = rand(0, 20);
        const otSal = Math.round((base / 176) * 1.5 * ot * 100) / 100;
        rows.push({ userId: u.id, month, totalHours: rand(168, 192), overtimeHours: ot, baseSalary: base, overtimeSalary: otSal, totalSalary: base + otSal, calculatedAt: new Date(`${month}-28T10:00:00`) });
      }
    }
    await prisma.payroll.createMany({ data: rows });
    console.log(`✅ Monthly Payroll: ${rows.length} records`);
  } else console.log(`⏭️  Payroll: ${payrollCount} exist`);

  // ── 17. TAX FILINGS ───────────────────────────────────────────
  const taxCount = await prisma.taxFiling.count();
  if (taxCount < 3) {
    await prisma.taxFiling.createMany({ data: [
      { filingType: "VAT",     dueDate: d(-15),  amount: 45800, status: "PAID",    filedById: ACCOUNTANT },
      { filingType: "Income",  dueDate: d(-30),  amount: 28500, status: "FILED",   filedById: ACCOUNTANT },
      { filingType: "Payroll", dueDate: d(-5),   amount: 12600, status: "PENDING", filedById: ACCOUNTANT },
      { filingType: "VAT",     dueDate: d(15),   amount: 48200, status: "PENDING" },
      { filingType: "VAT",     dueDate: d(-85),  amount: 42500, status: "PAID",    filedById: ACCOUNTANT },
      { filingType: "Income",  dueDate: d(-90),  amount: 26800, status: "PAID",    filedById: ACCOUNTANT },
      { filingType: "Payroll", dueDate: d(-65),  amount: 11900, status: "PAID",    filedById: ACCOUNTANT },
      { filingType: "VAT",     dueDate: d(45),   amount: 50100, status: "PENDING" },
    ]});
    console.log("✅ Tax Filings: 8");
  } else console.log(`⏭️  Tax: ${taxCount} exist`);

  // ── 18. BANK RECONCILIATIONS ──────────────────────────────────
  const bankCount = await prisma.bankReconciliation.count();
  if (bankCount < 3) {
    await prisma.bankReconciliation.createMany({ data: [
      { accountName: "البنك العربي - حساب العمليات",    bankBalance: 485000, bookBalance: 483200, reconciled: true,  reconciledById: ACCOUNTANT, notes: "فارق بسيط في تواريخ تسجيل المدفوعات" },
      { accountName: "بنك الاستثمار الفلسطيني - رواتب", bankBalance: 128500, bookBalance: 128500, reconciled: true,  reconciledById: ACCOUNTANT, notes: "مطابقة كاملة" },
      { accountName: "البنك الإسلامي الفلسطيني",        bankBalance: 225000, bookBalance: 221800, reconciled: false, reconciledById: ACCOUNTANT, notes: "قيد المراجعة - شيكات معلقة" },
      { accountName: "البنك العربي - حساب رأس المال",   bankBalance: 512000, bookBalance: 510500, reconciled: true,  reconciledById: ACCOUNTANT },
      { accountName: "بنك القدس للتجارة",               bankBalance: 95000,  bookBalance: 95000,  reconciled: true,  reconciledById: ACCOUNTANT, notes: "مطابقة كاملة" },
      { accountName: "البنك الإسلامي - حساب ادخار",    bankBalance: 198000, bookBalance: 196500, reconciled: false, notes: "قيد المراجعة" },
    ]});
    console.log("✅ Bank Reconciliations: 6");
  } else console.log(`⏭️  Bank: ${bankCount} exist`);

  // ── 19. CUSTOMER RECEIVABLES ──────────────────────────────────
  const recvCount = await prisma.customerReceivable.count();
  if (recvCount < 5) {
    await prisma.customerReceivable.createMany({ data: [
      { customerId: 8,  amount: 40000, dueDate: d(-2),  status: "OVERDUE", notes: "فاتورة PLT-2026-006 - متأخرة" },
      { customerId: 9,  amount: 31500, dueDate: d(8),   status: "PENDING", notes: "فاتورة PLT-2026-007" },
      { customerId: 10, amount: 25000, dueDate: d(12),  status: "PENDING", notes: "فاتورة PLT-2026-008" },
      { customerId: 11, amount: 48000, dueDate: d(15),  status: "PENDING", notes: "فاتورة PLT-2026-009" },
      { customerId: 12, amount: 22000, dueDate: d(18),  status: "PENDING", notes: "فاتورة PLT-2026-010" },
      { customerId: 8,  amount: 35000, dueDate: d(25),  status: "PENDING", notes: "فاتورة PLT-2026-011" },
      { customerId: 9,  amount: 27000, dueDate: d(30),  status: "PENDING", notes: "فاتورة PLT-2026-012" },
      { customerId: 11, amount: 15000, dueDate: d(-10), status: "OVERDUE", notes: "فاتورة قديمة - متأخرة" },
    ]});
    console.log("✅ Customer Receivables: 8");
  } else console.log(`⏭️  Receivables: ${recvCount} exist`);

  // ── 20. SUPPLIER PAYABLES ─────────────────────────────────────
  const payableCount = await prisma.supplierPayable.count();
  if (payableCount < 5) {
    await prisma.supplierPayable.createMany({ data: [
      { supplierId: 3, amount: 85000,  dueDate: d(-25), paymentStatus: "PAID",    notes: "HDPE - دفعة أبريل" },
      { supplierId: 4, amount: 171000, dueDate: d(-20), paymentStatus: "PAID",    notes: "PET - طلبية كبيرة" },
      { supplierId: 5, amount: 30240,  dueDate: d(-15), paymentStatus: "PAID",    notes: "LDPE - مايو" },
      { supplierId: 6, amount: 47600,  dueDate: d(-10), paymentStatus: "PAID",    notes: "PP - مايو" },
      { supplierId: 7, amount: 19800,  dueDate: d(-5),  paymentStatus: "PENDING", notes: "ألوان - مايو" },
      { supplierId: 3, amount: 42500,  dueDate: d(5),   paymentStatus: "PENDING", notes: "HDPE - يونيو" },
      { supplierId: 4, amount: 90250,  dueDate: d(10),  paymentStatus: "PENDING", notes: "PET - يونيو" },
      { supplierId: 5, amount: 20800,  dueDate: d(15),  paymentStatus: "PENDING", notes: "مواد لاصقة" },
    ]});
    console.log("✅ Supplier Payables: 8");
  } else console.log(`⏭️  Payables: ${payableCount} exist`);

  // ── 21. COST ANALYSIS ─────────────────────────────────────────
  const costCount = await prisma.costAnalysis.count();
  if (costCount < 5) {
    const rows: any[] = [];
    for (const period of ["2026-03", "2026-04", "2026-05"]) {
      const cats = [
        { category: "مواد خام",      cost: rf(280000, 320000), percentage: 42 },
        { category: "رواتب",         cost: rf(85000,  95000),  percentage: 13 },
        { category: "كهرباء",        cost: rf(15000,  20000),  percentage: 2.5 },
        { category: "صيانة",         cost: rf(18000,  28000),  percentage: 3.5 },
        { category: "تغليف",         cost: rf(35000,  45000),  percentage: 6 },
        { category: "نقل وتوزيع",    cost: rf(25000,  35000),  percentage: 4.5 },
        { category: "مصاريف إدارية", cost: rf(12000,  18000),  percentage: 2.2 },
      ];
      cats.forEach(c => rows.push({ ...c, period }));
    }
    await prisma.costAnalysis.createMany({ data: rows });
    console.log(`✅ Cost Analysis: ${rows.length}`);
  } else console.log(`⏭️  Cost: ${costCount} exist`);

  // ── 22. FINANCIAL REPORTS ─────────────────────────────────────
  const frCount = await prisma.financialReport.count();
  if (frCount < 3) {
    await prisma.financialReport.createMany({ data: [
      { title: "تقرير الأرباح والخسائر - مارس 2026",   reportType: "P&L",         period: "March 2026", generatedById: ACCOUNTANT, createdAt: d(68) },
      { title: "الميزانية العمومية - Q1 2026",          reportType: "BalanceSheet", period: "Q1 2026",    generatedById: ACCOUNTANT, createdAt: d(65) },
      { title: "تقرير التدفقات النقدية - مارس 2026",   reportType: "CashFlow",     period: "March 2026", generatedById: ACCOUNTANT, createdAt: d(65) },
      { title: "تقرير الأرباح والخسائر - أبريل 2026",  reportType: "P&L",         period: "April 2026", generatedById: ACCOUNTANT, createdAt: d(35) },
      { title: "الميزانية العمومية - أبريل 2026",      reportType: "BalanceSheet", period: "April 2026", generatedById: ACCOUNTANT, createdAt: d(35) },
      { title: "تقرير التدفقات النقدية - أبريل 2026",  reportType: "CashFlow",     period: "April 2026", generatedById: ACCOUNTANT, createdAt: d(35) },
      { title: "تقرير الأرباح والخسائر - مايو 2026",   reportType: "P&L",         period: "May 2026",   generatedById: ACCOUNTANT, createdAt: d(5)  },
      { title: "تقرير تحليل التكاليف - Q1 2026",       reportType: "CostAnalysis", period: "Q1 2026",   generatedById: ACCOUNTANT, createdAt: d(60) },
    ]});
    console.log("✅ Financial Reports: 8");
  } else console.log(`⏭️  Reports: ${frCount} exist`);

  // ── 23. APPROVAL WORKFLOWS ────────────────────────────────────
  const wfCount = await prisma.approvalWorkflow.count();
  if (wfCount < 3) {
    await prisma.approvalWorkflow.createMany({ data: [
      { workflowName: "اعتماد طلبات الشراء",    status: "ACTIVE",   itemsCount: 12, approverCount: 2, createdById: ACCOUNTANT },
      { workflowName: "اعتماد المصاريف",         status: "ACTIVE",   itemsCount: 8,  approverCount: 1, createdById: ACCOUNTANT },
      { workflowName: "اعتماد الفواتير",         status: "ACTIVE",   itemsCount: 5,  approverCount: 2, createdById: ACCOUNTANT },
      { workflowName: "مراجعة طلبات قطع الغيار", status: "ACTIVE",   itemsCount: 7,  approverCount: 2, createdById: ACCOUNTANT },
      { workflowName: "اعتماد رواتب الموظفين",   status: "ACTIVE",   itemsCount: 13, approverCount: 1, createdById: ACCOUNTANT },
      { workflowName: "موافقة طلبات الإجازة",    status: "INACTIVE", itemsCount: 0,  approverCount: 1, createdById: ADMIN },
    ]});
    console.log("✅ Approval Workflows: 6");
  } else console.log(`⏭️  Workflows: ${wfCount} exist`);

  // ── 24. EMPLOYEE PERFORMANCE ──────────────────────────────────
  const perfCount = await prisma.employeePerformance.count();
  if (perfCount < 10) {
    const rows: any[] = [];
    for (const month of ["2026-03", "2026-04", "2026-05"]) {
      for (const uid of [...WORKERS, ...ENGINEERS]) {
        const ps = rand(75, 98), qs = rand(80, 99), as_ = rand(85, 100), ks = rand(60, 95);
        rows.push({ userId: uid, periodType: "WEEKLY", periodDate: new Date(`${month}-01`), productionScore: ps, qualityScore: qs, attendanceScore: as_, kaizenScore: ks, totalScore: Math.round((ps + qs + as_ + ks) / 4), calculatedById: ADMIN });
      }
    }
    await prisma.employeePerformance.createMany({ data: rows });
    console.log(`✅ Employee Performance: ${rows.length}`);
  } else console.log(`⏭️  Performance: ${perfCount} exist`);

  // ── 25. ENGINEER INVENTORY ────────────────────────────────────
  const eiCount = await prisma.engineerInventory.count();
  if (eiCount < 3) {
    const items = [
      { partName: "مفتاح إنجليزي 24mm",      quantity: 2, unitPrice: 85,  pricedById: ACCOUNTANT, pricedAt: d(32) },
      { partName: "مفتاح توك T40",            quantity: 4, unitPrice: 35,  pricedById: ACCOUNTANT, pricedAt: d(32) },
      { partName: "جهاز قياس درجة الحرارة",   quantity: 1, unitPrice: 450, pricedById: ACCOUNTANT, pricedAt: d(32) },
      { partName: "مقياس ضغط هواء",           quantity: 2, unitPrice: 120, pricedById: ACCOUNTANT, pricedAt: d(32) },
      { partName: "مصباح كشاف للصيانة",        quantity: 3, unitPrice: 65,  pricedById: ACCOUNTANT, pricedAt: d(32) },
    ];
    for (const eid of [7, 9, 12, 13]) {
      for (const [month, year, daysAgo_, reviewed] of [[4, 2026, 35, true], [5, 2026, 5, false]] as [number, number, number, boolean][]) {
        try {
          await prisma.engineerInventory.create({ data: { engineerId: eid, month, year, status: reviewed ? "REVIEWED" as any : "SUBMITTED" as any, submittedAt: d(daysAgo_), reviewedAt: reviewed ? d(daysAgo_ - 3) : null, reviewedById: reviewed ? ADMIN : null, items: { create: items } } });
        } catch (e: any) { if (!e.message?.includes("nique")) throw e; }
      }
    }
    console.log("✅ Engineer Inventories: created");
  } else console.log(`⏭️  Eng Inventory: ${eiCount} exist`);

  // ── 26. CHAT GROUPS + MESSAGES ────────────────────────────────
  const cgCount = await prisma.chatGroup.count();
  if (cgCount < 3) {
    const msgs = [
      "صباح الخير للجميع", "تم إنهاء الصيانة الدورية لخط الكابس بنجاح",
      "يرجى الالتزام بإجراءات السلامة أثناء العمل", "الإنتاج اليوم ممتاز - تجاوزنا الهدف",
      "هناك اجتماع في الساعة 3 عصراً لمناقشة خطة الإنتاج",
      "تم استلام شحنة HDPE من المورد - الكمية: 10 طن",
      "تقرير جودة اليوم: 97.8% - ممتاز", "مطلوب مراجعة طلبات قطع الغيار المعلقة",
      "تم تسليم طلبية شركة المياه الوطنية - 500,000 غطاء",
      "الكفاءة الإنتاجية هذا الأسبوع: 94%", "يرجى إرسال تقارير الإنتاج قبل نهاية الوردية",
      "انتبهوا: سيتم إيقاف التيار الكهربائي غداً من 2-4 عصراً للصيانة",
    ];
    const groupDefs = [
      { name: "مجموعة المصنع العامة",    desc: "القناة الرئيسية للتواصل في مصنع بلاستيكون", cat: "GENERAL" as any,    members: ALL_USERS },
      { name: "فريق المهندسين",          desc: "تنسيق أعمال الصيانة والإنتاج",              cat: "TEAM" as any,       members: [ADMIN, ...ENGINEERS] },
      { name: "قسم المالية والإدارة",    desc: "التنسيق المالي والإداري",                   cat: "DEPARTMENT" as any, members: [ADMIN, ACCOUNTANT, 7, 9] },
    ];
    for (const g of groupDefs) {
      const grp = await prisma.chatGroup.create({ data: { name: g.name, description: g.desc, category: g.cat, createdById: ADMIN, members: { createMany: { data: g.members.map(uid => ({ userId: uid, role: uid === ADMIN ? "ADMIN" as any : "MEMBER" as any })), skipDuplicates: true } } } });
      await prisma.groupMessage.createMany({ data: msgs.map((content, i) => ({ groupId: grp.id, senderId: pick(g.members), content, createdAt: d(rand(1, 14), rand(8, 22)) })) });
    }
    console.log("✅ Chat Groups + Messages: 3 groups, 12 msgs each");
  } else console.log(`⏭️  Chat: ${cgCount} exist`);

  // ── 27. NOTIFICATIONS ─────────────────────────────────────────
  const notifCount = await prisma.notification.count();
  if (notifCount < 30) {
    const rows: any[] = [];
    for (const uid of ALL_USERS) {
      rows.push({ userId: uid, title: "مرحباً بك في بلاستيكون",   message: "تم تحديث نظام الإدارة - ميزات جديدة متاحة", type: "SYSTEM_MESSAGE",   isRead: true,  createdAt: d(30) });
      rows.push({ userId: uid, title: "تقرير الرواتب جاهز",       message: "تم احتساب رواتب شهر مايو 2026 - يرجى المراجعة", type: "PAYROLL_READY",  isRead: false, createdAt: d(5)  });
    }
    for (const uid of ENGINEERS) rows.push({ userId: uid, title: "تنبيه: مخزون منخفض", message: "مستوى مادة HDPE وصل للحد الأدنى - يرجى طلب توريد", type: "INVENTORY_LOW", isRead: false, createdAt: d(2) });
    rows.push({ userId: ADMIN, title: "طلبات تسجيل جديدة", message: "يوجد 3 طلبات تسجيل بانتظار المراجعة", type: "REGISTRATION_REQUEST", isRead: false, createdAt: d(1) });
    await prisma.notification.createMany({ data: rows });
    console.log(`✅ Notifications: ${rows.length}`);
  } else console.log(`⏭️  Notifications: ${notifCount} exist`);

  // ── 28. REGISTRATION REQUESTS ─────────────────────────────────
  const regCount = await prisma.registrationRequest.count();
  if (regCount < 3) {
    await prisma.registrationRequest.createMany({ data: [
      { fullName: "عمر خليل عبد الله",  email: "omar.khalil@email.ps",  phone: "+970-59-123-4567", role: "WORKER" as any,     message: "أرغب في الالتحاق بالعمل كعامل إنتاج",             status: "PENDING" },
      { fullName: "سارة محمد النابلسي", email: "sara.nablusi@email.ps",  phone: "+970-59-234-5678", role: "ENGINEER" as any,   message: "مهندسة ميكانيك - 5 سنوات خبرة في صناعة البلاستيك", status: "PENDING" },
      { fullName: "أحمد يوسف العواودة", email: "ahmed.awada@email.ps",   phone: "+970-59-345-6789", role: "ACCOUNTANT" as any, message: "محاسب قانوني - خبرة في الشركات الصناعية",           status: "APPROVED", reviewedById: ADMIN, reviewedAt: d(5), reviewNote: "تمت الموافقة" },
      { fullName: "مريم إبراهيم حسن",   email: "mariam.hassan@email.ps", phone: "+970-59-456-7890", role: "WORKER" as any,     message: "أبحث عن فرصة عمل في قسم الإنتاج",                   status: "REJECTED", reviewedById: ADMIN, reviewedAt: d(10), reviewNote: "لا توجد وظائف شاغرة حالياً" },
      { fullName: "يوسف خالد الطيب",    email: "yousef.taib@email.ps",   phone: "+970-59-567-8901", role: "ENGINEER" as any,   message: "مهندس كهرباء - متخصص في الأتمتة الصناعية",         status: "PENDING" },
    ]});
    console.log("✅ Registration Requests: 5");
  } else console.log(`⏭️  Reg Requests: ${regCount} exist`);

  // ── 29. AUDIT LOGS ────────────────────────────────────────────
  const auditCount = await prisma.auditLog.count();
  if (auditCount < 20) {
    await prisma.auditLog.createMany({ data: [
      { userId: ADMIN,      action: "USER_CREATED",          entityType: "User",             entityId: 5,  createdAt: d(60) },
      { userId: ADMIN,      action: "SALARY_CONFIG_UPDATED", entityType: "SalaryConfig",     entityId: 1,  createdAt: d(45) },
      { userId: ACCOUNTANT, action: "INVOICE_CREATED",       entityType: "Invoice",          entityId: 1,  createdAt: d(55) },
      { userId: ACCOUNTANT, action: "PAYROLL_CALCULATED",    entityType: "Payroll",          entityId: 1,  createdAt: d(35) },
      { userId: ADMIN,      action: "MACHINE_STATUS_CHANGE", entityType: "Machine",          entityId: 7,  createdAt: d(14) },
      { userId: ACCOUNTANT, action: "EXPENSE_APPROVED",      entityType: "Expense",          entityId: 1,  createdAt: d(34) },
      { userId: ACCOUNTANT, action: "TAX_FILING_SUBMITTED",  entityType: "TaxFiling",        entityId: 1,  createdAt: d(85) },
      { userId: ADMIN,      action: "SETTINGS_UPDATED",      entityType: "SystemSetting",    entityId: 1,  createdAt: d(20) },
      { userId: ACCOUNTANT, action: "FINANCIAL_REPORT",      entityType: "FinancialReport",  entityId: 1,  createdAt: d(65) },
      { userId: ADMIN,      action: "REGISTRATION_APPROVED", entityType: "RegistrationRequest", entityId: 3, createdAt: d(5) },
    ]});
    console.log("✅ Audit Logs: 10");
  } else console.log(`⏭️  Audit: ${auditCount} exist`);

  console.log("\n🎉 All pages seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect().catch(() => {}));
