import "dotenv/config";
import { prisma } from "../src/config/lib/prisma";

async function main() {
  console.log("🌱 Seeding real Palestinian factory data...\n");

  // ── 1. Suppliers ────────────────────────────────────────────────────────────
  const suppliers = [
    {
      name: "الشركة العربية للبلاستيك والمواد الكيماوية",
      contactPerson: "محمد عبد الرحمن",
      phone: "+962-6-4891234",
      email: "info@arabplastic.jo",
      address: "عمان، الأردن - منطقة صناعية أم القطين",
      category: "مواد خام",
      website: "www.arabplastic.jo",
      rating: 4.5,
      leadTimeDays: 7,
      notes: "مورد رئيسي لـ HDPE وPP - سعر تنافسي وتسليم منتظم",
    },
    {
      name: "شركة الخليج للبتروكيماويات",
      contactPerson: "خالد النمر",
      phone: "+966-13-8471200",
      email: "sales@gulfpetro.sa",
      address: "الدمام، المملكة العربية السعودية",
      category: "بتروكيماويات",
      website: "www.gulfpetro.sa",
      rating: 4.8,
      leadTimeDays: 14,
      notes: "أفضل أسعار لـ PET وHDPE في المنطقة - شحن منتظم شهرياً",
    },
    {
      name: "شركة حسن للمواد البلاستيكية",
      contactPerson: "حسن أبو كريم",
      phone: "+970-2-2971500",
      email: "hassan.plastics@gmail.com",
      address: "رام الله، فلسطين - المنطقة الصناعية",
      category: "مواد خام محلية",
      website: null,
      rating: 3.8,
      leadTimeDays: 2,
      notes: "مورد محلي للطوارئ والكميات الصغيرة",
    },
    {
      name: "مجموعة الحديدي للتجارة والصناعة",
      contactPerson: "فارس الحديدي",
      phone: "+970-2-2408800",
      email: "fares@hadeedi-group.ps",
      address: "نابلس، فلسطين",
      category: "تجارة صناعية",
      website: "www.hadeedi-group.ps",
      rating: 4.1,
      leadTimeDays: 3,
      notes: "وكيل محلي موثوق - متوفر 6 أيام في الأسبوع",
    },
    {
      name: "شركة البيك للمستلزمات الصناعية",
      contactPerson: "رياض البيك",
      phone: "+962-3-2031800",
      email: "riad@albaik-industrial.jo",
      address: "الزرقاء، الأردن - المنطقة الصناعية الحرة",
      category: "مستلزمات صناعية",
      website: "www.albaik-industrial.jo",
      rating: 4.2,
      leadTimeDays: 5,
      notes: "مورد قطع الغيار ومستلزمات الماكينات",
    },
    {
      name: "شركة ترك كيم للكيماويات",
      contactPerson: "Mehmet Yilmaz",
      phone: "+90-212-4921000",
      email: "sales@turkchem.com.tr",
      address: "إسطنبول، تركيا - المنطقة الصناعية إيكيتيللي",
      category: "كيماويات",
      website: "www.turkchem.com.tr",
      rating: 4.6,
      leadTimeDays: 21,
      notes: "مورد ماستر باتش والألوان والمضافات الكيماوية - جودة أوروبية",
    },
    {
      name: "الشركة الفلسطينية للاستيراد والتصدير",
      contactPerson: "عمر سلامة",
      phone: "+970-8-2064900",
      email: "info@palimex.ps",
      address: "غزة، فلسطين",
      category: "استيراد وتصدير",
      website: "www.palimex.ps",
      rating: 4.0,
      leadTimeDays: 10,
      notes: "وكيل رسمي لعدة شركات دولية لمواد التعبئة",
    },
    {
      name: "مؤسسة أبو ظهر للتجارة العامة",
      contactPerson: "سامي أبو ظهر",
      phone: "+970-4-6503500",
      email: "s.abuzahr@gmail.com",
      address: "جنين، فلسطين",
      category: "تجارة عامة",
      website: null,
      rating: 3.5,
      leadTimeDays: 4,
      notes: "توريد مواد تعبئة وتغليف للمنطقة الشمالية",
    },
  ];

  let supplierCount = 0;
  for (const s of suppliers) {
    const exists = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!exists) {
      await prisma.supplier.create({ data: s });
      supplierCount++;
    }
  }
  console.log(`✅ Suppliers: added ${supplierCount} new`);

  // ── 2. Customers ────────────────────────────────────────────────────────────
  const customers = [
    { name: "شركة المياه الوطنية الفلسطينية", phone: "+970-2-2404444", email: "procurement@pwa.ps", address: "رام الله، فلسطين" },
    { name: "شركة بيبسي كولا فلسطين", phone: "+970-2-2971100", email: "orders@pepsi-palestine.ps", address: "رام الله، فلسطين" },
    { name: "مصنع الجزيرة للمياه المعدنية", phone: "+970-8-2064100", email: "sales@jazeera-water.ps", address: "غزة، فلسطين" },
    { name: "شركة النقاء للمياه والمشروبات", phone: "+970-4-6503000", email: "info@naqaa.ps", address: "جنين، فلسطين" },
    { name: "مجموعة أبو عيشة التجارية", phone: "+970-2-2988000", email: "orders@abuaisha.ps", address: "الخليل، فلسطين" },
    { name: "شركة الأمل للتعبئة والتغليف", phone: "+970-9-2374500", email: "sales@amal-pack.ps", address: "طولكرم، فلسطين" },
    { name: "مصنع القدس للمواد الغذائية", phone: "+970-2-2342500", email: "info@quds-food.ps", address: "القدس، فلسطين" },
    { name: "مؤسسة ريم للتجارة العامة", phone: "+970-2-2953100", email: "reem.trading@gmail.com", address: "بيت لحم، فلسطين" },
    { name: "شركة الشمالي للصناعات الغذائية", phone: "+970-4-6501200", email: "info@shamali-food.ps", address: "نابلس، فلسطين" },
    { name: "شركة الفجر للتوزيع والتجارة", phone: "+970-2-2409900", email: "fajr.dist@hotmail.com", address: "رام الله، فلسطين" },
    { name: "مصانع الاتحاد الغذائية", phone: "+970-2-2966100", email: "union-food@ps.net", address: "رام الله، فلسطين" },
    { name: "شركة نستله فلسطين", phone: "+970-2-2404000", email: "orders@nestle.ps", address: "رام الله، فلسطين" },
  ];

  let customerCount = 0;
  for (const c of customers) {
    const exists = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!exists) {
      await prisma.customer.create({ data: c });
      customerCount++;
    }
  }
  console.log(`✅ Customers: added ${customerCount} new`);

  // ── 3. Raw Materials with real quantities & prices ───────────────────────────
  const rawMaterials = [
    { name: "HDPE", currentQuantity: 12500, unit: "kg", minQuantity: 2000 },
    { name: "LDPE", currentQuantity: 4200, unit: "kg", minQuantity: 800 },
    { name: "PET", currentQuantity: 18000, unit: "kg", minQuantity: 3000 },
    { name: "PP (Polypropylene)", currentQuantity: 6800, unit: "kg", minQuantity: 1200 },
    { name: "ADHESIVE", currentQuantity: 950, unit: "kg", minQuantity: 200 },
    { name: "EMPTY_BAGS", currentQuantity: 8500, unit: "pcs", minQuantity: 1000 },
    { name: "COLOR", currentQuantity: 380, unit: "kg", minQuantity: 50 },
    { name: "Preform (PET)", currentQuantity: 25000, unit: "pcs", minQuantity: 5000 },
    { name: "Caps", currentQuantity: 85000, unit: "pcs", minQuantity: 10000 },
    { name: "ماستر باتش أبيض", currentQuantity: 520, unit: "kg", minQuantity: 100 },
    { name: "ماستر باتش أسود", currentQuantity: 210, unit: "kg", minQuantity: 50 },
    { name: "مثبت UV", currentQuantity: 85, unit: "kg", minQuantity: 20 },
    { name: "مادة تشحيم (Lubricant)", currentQuantity: 140, unit: "kg", minQuantity: 30 },
    { name: "صناديق كرتون", currentQuantity: 3200, unit: "pcs", minQuantity: 500 },
    { name: "شرائط تغليف", currentQuantity: 650, unit: "roll", minQuantity: 100 },
  ];

  let matCount = 0;
  for (const m of rawMaterials) {
    const existing = await prisma.rawMaterial.findFirst({ where: { name: m.name } });
    if (existing) {
      await prisma.rawMaterial.update({
        where: { id: existing.id },
        data: { currentQuantity: m.currentQuantity, minQuantity: m.minQuantity },
      });
    } else {
      await prisma.rawMaterial.create({ data: m });
      matCount++;
    }
  }
  console.log(`✅ Raw Materials: updated existing + added ${matCount} new`);

  // ── 4. Salary Configuration (Palestinian wage levels in NIS) ────────────────
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    const salaryConfigs = [
      { role: "WORKER",     monthlySalary: 3200 },
      { role: "ENGINEER",   monthlySalary: 6500 },
      { role: "ACCOUNTANT", monthlySalary: 5800 },
      { role: "ADMIN",      monthlySalary: 9500 },
    ];

    for (const sc of salaryConfigs) {
      const exists = await prisma.salaryConfig.findFirst({ where: { role: sc.role as any } });
      if (!exists) {
        await prisma.salaryConfig.create({
          data: { role: sc.role as any, monthlySalary: sc.monthlySalary, updatedById: admin.id },
        });
      } else {
        await prisma.salaryConfig.update({
          where: { id: exists.id },
          data: { monthlySalary: sc.monthlySalary, updatedById: admin.id },
        });
      }
    }
    console.log(`✅ Salary Config: seeded for all roles (NIS)`);
  }

  // ── 5. Deduction Rules (Palestinian standard deductions) ────────────────────
  if (admin) {
    // Schema: type (UNIQUE), isActive, thresholdMinutes, deductionValue
    // Supported types: "LATE_ARRIVAL" | "EARLY_CHECKOUT" | "UNEXCUSED_ABSENCE" | "SICK_LEAVE"
    const deductions = [
      { type: "LATE_ARRIVAL",      isActive: true,  thresholdMinutes: 15, deductionValue: 25 },
      { type: "EARLY_CHECKOUT",    isActive: true,  thresholdMinutes: 15, deductionValue: 25 },
      { type: "UNEXCUSED_ABSENCE", isActive: true,  thresholdMinutes: 0,  deductionValue: 150 },
      { type: "SICK_LEAVE",        isActive: false, thresholdMinutes: 0,  deductionValue: 0 },
    ];

    let dedCount = 0;
    for (const d of deductions) {
      const exists = await prisma.deductionRule.findFirst({ where: { type: d.type } });
      if (!exists) {
        await prisma.deductionRule.create({
          data: { ...d, updatedById: admin.id },
        });
        dedCount++;
      } else {
        await prisma.deductionRule.update({
          where: { id: exists.id },
          data: { isActive: d.isActive, thresholdMinutes: d.thresholdMinutes, deductionValue: d.deductionValue, updatedById: admin.id },
        });
      }
    }
    console.log(`✅ Deduction Rules: added ${dedCount}`);
  }

  // ── 6. Attendance Setting ────────────────────────────────────────────────────
  // Schema: lateGraceMinutes, overtimeGraceMinutes only
  const atSetting = await prisma.attendanceSetting.findFirst();
  if (!atSetting) {
    await prisma.attendanceSetting.create({
      data: { lateGraceMinutes: 15, overtimeGraceMinutes: 30 },
    });
    console.log(`✅ Attendance Setting: created`);
  }

  // ── 7. Financial Setting ─────────────────────────────────────────────────────
  // Schema: revenueTarget, expenseLimit, profitMarginTarget
  if (admin) {
    const finSetting = await prisma.financialSetting.findFirst();
    if (!finSetting) {
      await prisma.financialSetting.create({
        data: {
          revenueTarget: 5000000,
          expenseLimit: 3500000,
          profitMarginTarget: 25.0,
          updatedById: admin.id,
        },
      });
      console.log(`✅ Financial Setting: created (NIS targets)`);
    }
  }

  // ── 8. Machines with real Palestinian factory specs ──────────────────────────
  // Schema: name, type, status (MachineStatus enum: OPERATIONAL/MAINTENANCE/OFFLINE/DECOMMISSIONED)
  const machines = [
    { name: "Caps Line 428sp",           type: "CAPS",      status: "OPERATIONAL" as const },
    { name: "Preform Line 430pet",        type: "PREFORM",   status: "OPERATIONAL" as const },
    { name: "Blowing Machine BM-500",     type: "BLOWING",   status: "OPERATIONAL" as const },
    { name: "Injection Mold IM-200",      type: "INJECTION", status: "UNDER_MAINTENANCE" as const },
    { name: "Compressor Atlas Copco GA55",type: "UTILITY",   status: "OPERATIONAL" as const },
  ];

  let machineCount = 0;
  for (const m of machines) {
    const exists = await prisma.machine.findFirst({ where: { name: m.name } });
    if (!exists) {
      await prisma.machine.create({ data: m });
      machineCount++;
    }
  }
  console.log(`✅ Machines: ${machineCount} added`);

  // ── 9. Spare Parts ────────────────────────────────────────────────────────────
  // Schema: machineId, name, quantity, minQuantity, unitPrice, supplier, notes
  const capsLine = await prisma.machine.findFirst({ where: { name: "Caps Line 428sp" } });
  const preformLine = await prisma.machine.findFirst({ where: { name: "Preform Line 430pet" } });

  if (capsLine && preformLine) {
    const spareParts = [
      { name: "بكرة ناقل حركة - كابس لاين",  quantity: 4,   minQuantity: 2,  unitPrice: 380,  machineId: capsLine.id,    supplier: "SACMI Italy",            notes: "تُستبدل كل 6 أشهر" },
      { name: "نظام تبريد مياه - كابس",       quantity: 2,   minQuantity: 1,  unitPrice: 1200, machineId: capsLine.id,    supplier: "شركة البيك",             notes: "" },
      { name: "مسامير قوالب HDPE",            quantity: 96,  minQuantity: 48, unitPrice: 85,   machineId: capsLine.id,    supplier: "SACMI Italy",            notes: "قياس M8x25 - ستانلس ستيل" },
      { name: "حلقات ختم - بريفورم",          quantity: 8,   minQuantity: 4,  unitPrice: 650,  machineId: preformLine.id, supplier: "Husky Injection Molding",notes: "ختم هيدروليكي عالي الضغط" },
      { name: "زيت تشحيم ماكينات",            quantity: 120, minQuantity: 30, unitPrice: 18,   machineId: capsLine.id,    supplier: "شركة البيك",             notes: "ISO VG 46 - 5 لتر/علبة" },
      { name: "فلتر هواء مضغوط",              quantity: 12,  minQuantity: 6,  unitPrice: 95,   machineId: preformLine.id, supplier: "Atlas Copco",            notes: "تُغير شهرياً" },
      { name: "حساس درجة حرارة PET",          quantity: 6,   minQuantity: 3,  unitPrice: 420,  machineId: preformLine.id, supplier: "Husky Injection Molding",notes: "نوع PT100 - مقاوم للحرارة حتى 300°م" },
      { name: "قطعة ناقل حركة رئيسية",        quantity: 2,   minQuantity: 1,  unitPrice: 2800, machineId: capsLine.id,    supplier: "شركة البيك",             notes: "الجزء الحرج - يجب توفر قطعة احتياطية دائماً" },
    ];

    let spareCount = 0;
    for (const sp of spareParts) {
      const exists = await prisma.sparePart.findFirst({ where: { name: sp.name, machineId: sp.machineId } });
      if (!exists) {
        await prisma.sparePart.create({ data: sp });
        spareCount++;
      }
    }
    console.log(`✅ Spare Parts: added ${spareCount}`);
  }

  // ── 10. Production Settings ──────────────────────────────────────────────────
  // Schema: productType (unique), piecesPerCarton
  if (admin) {
    const prodSettings = [
      { productType: "CAPS",    piecesPerCarton: 1000 },
      { productType: "PREFORM", piecesPerCarton: 500 },
    ];

    for (const ps of prodSettings) {
      const exists = await prisma.productionSetting.findFirst({ where: { productType: ps.productType as any } });
      if (!exists) {
        await prisma.productionSetting.create({
          data: { productType: ps.productType as any, piecesPerCarton: ps.piecesPerCarton, updatedById: admin.id },
        });
      }
    }
    console.log(`✅ Production Settings: seeded`);
  }

  // ── 11. System Setting ────────────────────────────────────────────────────────
  // Schema: qualityCheckIntervalMinutes, qualityCheckReminderMinutes, inventoryAuditFrequency,
  //         shiftEndReminderMinutes, weeklyReportDayOfWeek, weeklyReportTime,
  //         monthlyReportDayOfMonth, monthlyReportTime
  if (admin) {
    const sysSetting = await prisma.systemSetting.findFirst();
    if (!sysSetting) {
      await prisma.systemSetting.create({
        data: {
          qualityCheckIntervalMinutes: 120,
          qualityCheckReminderMinutes: 15,
          inventoryAuditFrequency: "WEEKLY" as any,
          shiftEndReminderMinutes: 30,
          weeklyReportDayOfWeek: 0,
          weeklyReportTime: "07:00",
          monthlyReportDayOfMonth: 1,
          monthlyReportTime: "07:00",
          updatedById: admin.id,
        },
      });
      console.log(`✅ System Setting: created`);
    }
  }

  // ── 12. Technical Documents ──────────────────────────────────────────────────
  // Schema: title, category, description, uploadedById, downloadCount
  if (admin) {
    const techDocs = [
      { title: "دليل تشغيل ماكينة كابس لاين 428sp",        category: "Manual",    description: "دليل التشغيل والصيانة الكامل لماكينة SACMI CCM48S لإنتاج أغطية HDPE" },
      { title: "معايير جودة الأغطية البلاستيكية ISO 15223", category: "Reference", description: "المعايير الدولية للأغطية البلاستيكية للمواد الغذائية والمشروبات وفق ISO 15223" },
      { title: "إجراءات السلامة والصحة المهنية",           category: "Safety",    description: "دليل إجراءات السلامة المهنية في المصنع وفق متطلبات سلامة العمل الفلسطينية" },
      { title: "مواصفات مادة HDPE للأغطية",                category: "Reference", description: "مواصفات مادة HDPE المستخدمة في إنتاج الأغطية - الكثافة، نقطة الانصهار، معدل التدفق" },
      { title: "دليل معايرة حساسات درجة الحرارة",          category: "Maintenance",description: "إجراءات معايرة حساسات PT100 في ماكينة البريفورم وتردد المعايرة المطلوب" },
      { title: "تقرير فحص جودة إنتاج يونيو 2025",          category: "Reference", description: "تقرير فحص جودة شهر يونيو 2025 - نتائج اختبارات الضغط والانضغاط للأغطية والبريفورم" },
    ];

    let docCount = 0;
    for (const doc of techDocs) {
      const exists = await prisma.techDocument.findFirst({ where: { title: doc.title } });
      if (!exists) {
        await prisma.techDocument.create({
          data: { title: doc.title, category: doc.category, description: doc.description, uploadedById: admin.id, downloadCount: Math.floor(Math.random() * 25) },
        });
        docCount++;
      }
    }
    console.log(`✅ Technical Documents: added ${docCount}`);
  }

  // ── 13. Budget Plans ─────────────────────────────────────────────────────────
  // Schema: month ("YYYY-MM"), category, allocated, spent, createdById
  if (admin) {
    const currentYear = new Date().getFullYear();
    const budgetPlans = [
      { month: `${currentYear}-01`, category: "مواد خام",    allocated: 850000, spent: 420000 },
      { month: `${currentYear}-01`, category: "موارد بشرية", allocated: 580000, spent: 290000 },
      { month: `${currentYear}-01`, category: "طاقة",        allocated: 120000, spent: 58000  },
      { month: `${currentYear}-01`, category: "صيانة",       allocated: 95000,  spent: 32000  },
      { month: `${currentYear}-01`, category: "تسويق",       allocated: 65000,  spent: 18000  },
    ];

    let budgetCount = 0;
    for (const bp of budgetPlans) {
      const exists = await prisma.budgetPlan.findFirst({ where: { month: bp.month, category: bp.category } });
      if (!exists) {
        await prisma.budgetPlan.create({
          data: { month: bp.month, category: bp.category, allocated: bp.allocated, spent: bp.spent, createdById: admin.id },
        });
        budgetCount++;
      }
    }
    console.log(`✅ Budget Plans: added ${budgetCount}`);
  }

  // ── 14. Electricity kWh Price ────────────────────────────────────────────────
  // Schema: price (not pricePerKwh)
  if (admin) {
    const kwhPrice = await prisma.electricityKwhPrice.findFirst({ orderBy: { createdAt: "desc" } });
    if (!kwhPrice) {
      await prisma.electricityKwhPrice.create({
        data: { price: 0.62, setById: admin.id, notes: "سعر الكيلوواط ساعة من شركة الكهرباء الفلسطينية - يونيو 2025" },
      });
      console.log(`✅ Electricity kWh Price: set to 0.62 NIS/kWh`);
    }
  }

  console.log("\n🎉 Palestinian factory data seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
