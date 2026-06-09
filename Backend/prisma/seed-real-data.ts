/**
 * Real-data seed for Plasticon Factory Management System
 * Palestinian companies: Al-Quds Water, Lamico General Trading, + regional partners
 * Run: npx ts-node --project tsconfig.json prisma/seed-real-data.ts
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { UserRole } from "../src/config/generated/prisma/client";
import { prisma } from "../src/config/lib/prisma";

const PASS = "Pass1234!";
const SALT = 12;

// ─── helpers ───────────────────────────────────────────────────────────────────
const d = (offsetDays: number, hour = 9, min = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, min, 0, 0);
  return dt;
};
const dFixed = (year: number, month: number, day: number, hour = 9) =>
  new Date(year, month - 1, day, hour, 0, 0);

// ─── 1. Real users (Palestinian names) ────────────────────────────────────────
async function seedRealUsers() {
  const hash = await bcrypt.hash(PASS, SALT);
  const shiftB = await prisma.shift.findFirst({ where: { name: "B" }, select: { id: true } });

  const users = [
    // Admin
    {
      nationalId: "900100001", fullName: "محمد أبو رمضان", username: "m.aburamadan",
      phone: "0599-201-001", email: "m.aburamadan@plasticon.ps",
      role: UserRole.ADMIN, jobTitle: "مدير عام", department: "الإدارة",
    },
    // Engineers
    {
      nationalId: "900100002", fullName: "أحمد الشويخ", username: "a.alshaweikh",
      phone: "0599-201-002", email: "a.alshaweikh@plasticon.ps",
      role: UserRole.ENGINEER, jobTitle: "مهندس إنتاج", department: "الهندسة",
    },
    {
      nationalId: "900100003", fullName: "خالد المصري", username: "k.almasri",
      phone: "0599-201-003", email: "k.almasri@plasticon.ps",
      role: UserRole.ENGINEER, jobTitle: "مهندس صيانة", department: "الهندسة",
    },
    // Accountant
    {
      nationalId: "900100004", fullName: "سامر الحلبي", username: "s.alhalabi",
      phone: "0599-201-004", email: "s.alhalabi@plasticon.ps",
      role: UserRole.ACCOUNTANT, jobTitle: "محاسب أول", department: "المالية",
    },
    // Workers
    {
      nationalId: "900100005", fullName: "يوسف قاسم", username: "y.qasim",
      phone: "0599-201-005", email: "y.qasim@plasticon.ps",
      role: UserRole.WORKER, jobTitle: "عامل إنتاج", department: "الإنتاج",
    },
    {
      nationalId: "900100006", fullName: "عمر زيدان", username: "o.zidan",
      phone: "0599-201-006", email: "o.zidan@plasticon.ps",
      role: UserRole.WORKER, jobTitle: "عامل إنتاج", department: "الإنتاج",
    },
    {
      nationalId: "900100007", fullName: "رامي عودة", username: "r.awda",
      phone: "0599-201-007", email: "r.awda@plasticon.ps",
      role: UserRole.WORKER, jobTitle: "عامل مخزن", department: "المستودعات",
    },
    // Sales Reps
    {
      nationalId: "900100008", fullName: "طارق سلامة", username: "t.salameh",
      phone: "0599-201-008", email: "t.salameh@plasticon.ps",
      role: UserRole.SALES_REP, jobTitle: "مندوب مبيعات - الضفة الغربية", department: "المبيعات",
    },
    {
      nationalId: "900100009", fullName: "ناصر جبارة", username: "n.jabara",
      phone: "0599-201-009", email: "n.jabara@plasticon.ps",
      role: UserRole.SALES_REP, jobTitle: "مندوب مبيعات - الشمال", department: "المبيعات",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, phone: u.phone, email: u.email, jobTitle: u.jobTitle, department: u.department },
      create: {
        ...u,
        password: hash,
        shiftId: [UserRole.WORKER, UserRole.ENGINEER].includes(u.role) ? (shiftB?.id ?? null) : null,
        isActive: true,
        profileCompleted: true,
      },
    });
    console.log(`Upserted: ${u.fullName} (${u.role})`);
  }
}

// ─── 2. Customers ─────────────────────────────────────────────────────────────
async function seedCustomers(salesRepId: number) {
  const customers = [
    {
      name: "شركة القدس للمياه",
      phone: "02-298-1100",
      email: "info@alqudswater.ps",
      address: "رام الله - المصيون، شارع إيرز",
      assignedSalesRepId: salesRepId,
    },
    {
      name: "لاميكو للتجارة العامة",
      phone: "02-240-7700",
      email: "lamico@lamico.ps",
      address: "رام الله - البالوع، منطقة صناعية",
      assignedSalesRepId: salesRepId,
    },
    {
      name: "شركة فلسطين للمشروبات",
      phone: "02-295-4400",
      email: "sales@palbev.ps",
      address: "رام الله - بيتونيا",
      assignedSalesRepId: salesRepId,
    },
    {
      name: "مصنع الحياة للعصائر",
      phone: "09-237-6600",
      email: "info@alhayatjuices.ps",
      address: "نابلس - المنطقة الصناعية",
      assignedSalesRepId: null,
    },
    {
      name: "شركة الوفاء للمياه والعصائر",
      phone: "02-222-9900",
      email: "sales@alwafa-water.ps",
      address: "بيت لحم - الدهيشة",
      assignedSalesRepId: null,
    },
    {
      name: "مجموعة النور للتعبئة والتغليف",
      phone: "04-652-1300",
      email: "info@alnour-pack.ps",
      address: "طولكرم - شارع الصناعة",
      assignedSalesRepId: salesRepId,
    },
    {
      name: "دندن للمواد الغذائية",
      phone: "02-227-3800",
      email: "dandan@dandan.ps",
      address: "الخليل - منطقة الحرس",
      assignedSalesRepId: null,
    },
    {
      name: "شركة الأمل للتوزيع",
      phone: "02-296-5500",
      email: "info@alamal-dist.ps",
      address: "رام الله - البيرة",
      assignedSalesRepId: salesRepId,
    },
  ];

  const ids: Record<string, number> = {};
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name }, select: { id: true } });
    let id: number;
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: c });
      id = existing.id;
    } else {
      const created = await prisma.customer.create({ data: c });
      id = created.id;
    }
    ids[c.name] = id;
    console.log(`Customer: ${c.name}`);
  }
  return ids;
}

// ─── 3. Suppliers ─────────────────────────────────────────────────────────────
async function seedSuppliers() {
  const suppliers = [
    {
      name: "الشركة العربية للبتروكيماويات",
      phone: "06-567-2200",
      email: "sales@arabpetro.jo",
      address: "عمّان - المنطقة الصناعية الأولى",
      contactPerson: "محمد الزعبي",
      category: "RAW_MATERIALS",
      rating: 4.5,
      leadTimeDays: 7,
      notes: "مورد رئيسي لـ HDPE و LDPE",
    },
    {
      name: "شركة الأهلي للكيماويات - فلسطين",
      phone: "02-295-8800",
      email: "info@ahli-chem.ps",
      address: "رام الله - البيرة",
      contactPerson: "سامي حداد",
      category: "RAW_MATERIALS",
      rating: 4.2,
      leadTimeDays: 3,
      notes: "مواد كيميائية وإضافات للبلاستيك",
    },
    {
      name: "مجموعة الشرق الأوسط للبوليمر",
      phone: "06-465-9900",
      email: "poly@mepolymers.jo",
      address: "إربد - المنطقة الصناعية",
      contactPerson: "خليل العمري",
      category: "RAW_MATERIALS",
      rating: 4.7,
      leadTimeDays: 10,
      notes: "PET والمواد الأولية عالية الجودة",
    },
    {
      name: "شركة الفلسطينية للمعدات الصناعية",
      phone: "02-298-4400",
      email: "info@pal-equipment.ps",
      address: "رام الله - مزموريه",
      contactPerson: "إياد البيطار",
      category: "SPARE_PARTS",
      rating: 3.9,
      leadTimeDays: 5,
      notes: "قطع غيار وأجهزة للآلات",
    },
    {
      name: "شركة طاقة فلسطين للخدمات",
      phone: "02-240-1200",
      email: "services@palpower.ps",
      address: "رام الله - وسط البلد",
      contactPerson: "فادي سلمان",
      category: "SERVICES",
      rating: 4.0,
      leadTimeDays: 1,
      notes: "خدمات الكهرباء والطاقة",
    },
  ];

  const ids: Record<string, number> = {};
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name }, select: { id: true } });
    let id: number;
    if (existing) {
      await prisma.supplier.update({ where: { id: existing.id }, data: s });
      id = existing.id;
    } else {
      const created = await prisma.supplier.create({ data: s });
      id = created.id;
    }
    ids[s.name] = id;
    console.log(`Supplier: ${s.name}`);
  }
  return ids;
}

// ─── 4. Purchases from suppliers ──────────────────────────────────────────────
async function seedPurchases(adminId: number, supplierIds: Record<string, number>) {
  const materials: Record<string, number> = {};
  for (const name of ["HDPE", "LDPE", "PET", "ADHESIVE", "COLOR"]) {
    const m = await prisma.rawMaterial.findFirst({ where: { name }, select: { id: true } });
    if (m) materials[name] = m.id;
  }

  const arabPetroId = supplierIds["الشركة العربية للبتروكيماويات"];
  const mepolymersId = supplierIds["مجموعة الشرق الأوسط للبوليمر"];
  const ahliChemId = supplierIds["شركة الأهلي للكيماويات - فلسطين"];

  const purchases = [
    {
      supplierId: arabPetroId, receivedById: adminId,
      totalAmount: 28500, invoiceImage: "invoices/PO-2026-001.pdf",
      date: dFixed(2026, 1, 5),
      items: [
        { materialId: materials["HDPE"], quantity: 5000, pricePerUnit: 3.8 },
        { materialId: materials["LDPE"], quantity: 2000, pricePerUnit: 4.1 },
      ],
    },
    {
      supplierId: mepolymersId, receivedById: adminId,
      totalAmount: 32000, invoiceImage: "invoices/PO-2026-002.pdf",
      date: dFixed(2026, 1, 18),
      items: [
        { materialId: materials["PET"], quantity: 6000, pricePerUnit: 5.2 },
      ],
    },
    {
      supplierId: ahliChemId, receivedById: adminId,
      totalAmount: 4800, invoiceImage: "invoices/PO-2026-003.pdf",
      date: dFixed(2026, 2, 2),
      items: [
        { materialId: materials["ADHESIVE"], quantity: 500, pricePerUnit: 6.0 },
        { materialId: materials["COLOR"], quantity: 300, pricePerUnit: 6.0 },
      ],
    },
    {
      supplierId: arabPetroId, receivedById: adminId,
      totalAmount: 31200, invoiceImage: "invoices/PO-2026-004.pdf",
      date: dFixed(2026, 2, 20),
      items: [
        { materialId: materials["HDPE"], quantity: 5500, pricePerUnit: 3.85 },
        { materialId: materials["LDPE"], quantity: 1800, pricePerUnit: 4.2 },
      ],
    },
    {
      supplierId: mepolymersId, receivedById: adminId,
      totalAmount: 29900, invoiceImage: "invoices/PO-2026-005.pdf",
      date: dFixed(2026, 3, 8),
      items: [
        { materialId: materials["PET"], quantity: 5500, pricePerUnit: 5.4 },
      ],
    },
    {
      supplierId: arabPetroId, receivedById: adminId,
      totalAmount: 34500, invoiceImage: "invoices/PO-2026-006.pdf",
      date: dFixed(2026, 4, 3),
      items: [
        { materialId: materials["HDPE"], quantity: 6000, pricePerUnit: 3.9 },
        { materialId: materials["LDPE"], quantity: 2200, pricePerUnit: 4.0 },
      ],
    },
    {
      supplierId: ahliChemId, receivedById: adminId,
      totalAmount: 5600, invoiceImage: "invoices/PO-2026-007.pdf",
      date: dFixed(2026, 4, 15),
      items: [
        { materialId: materials["ADHESIVE"], quantity: 600, pricePerUnit: 5.8 },
        { materialId: materials["COLOR"], quantity: 400, pricePerUnit: 5.5 },
      ],
    },
    {
      supplierId: mepolymersId, receivedById: adminId,
      totalAmount: 38400, invoiceImage: "invoices/PO-2026-008.pdf",
      date: dFixed(2026, 5, 6),
      items: [
        { materialId: materials["PET"], quantity: 7000, pricePerUnit: 5.35 },
      ],
    },
    {
      supplierId: arabPetroId, receivedById: adminId,
      totalAmount: 36800, invoiceImage: "invoices/PO-2026-009.pdf",
      date: dFixed(2026, 5, 22),
      items: [
        { materialId: materials["HDPE"], quantity: 6500, pricePerUnit: 3.85 },
        { materialId: materials["LDPE"], quantity: 2400, pricePerUnit: 4.0 },
      ],
    },
  ];

  for (const p of purchases) {
    const exists = await prisma.purchase.findFirst({
      where: { supplierId: p.supplierId, date: p.date, totalAmount: p.totalAmount },
      select: { id: true },
    });
    if (exists) { console.log(`Skipped existing purchase ${p.invoiceImage}`); continue; }

    await prisma.purchase.create({
      data: {
        supplierId: p.supplierId, receivedById: p.receivedById,
        totalAmount: p.totalAmount, invoiceImage: p.invoiceImage, date: p.date,
        items: { create: p.items },
      },
    });
    console.log(`Purchase: ${p.invoiceImage} — ₪${p.totalAmount}`);
  }
}

// ─── 5. Sales to customers ─────────────────────────────────────────────────────
async function seedSales(adminId: number, customerIds: Record<string, number>) {
  const qudisId = customerIds["شركة القدس للمياه"];
  const lamicoId = customerIds["لاميكو للتجارة العامة"];
  const palBevId = customerIds["شركة فلسطين للمشروبات"];
  const alhayatId = customerIds["مصنع الحياة للعصائر"];
  const alwafaId = customerIds["شركة الوفاء للمياه والعصائر"];
  const alnourId = customerIds["مجموعة النور للتعبئة والتغليف"];
  const dandanId = customerIds["دندن للمواد الغذائية"];
  const alamalId = customerIds["شركة الأمل للتوزيع"];

  const sales = [
    // January 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 18750, invoiceImage: "sales/INV-2026-001.pdf",
      date: dFixed(2026, 1, 8),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 125000, pricePerUnit: 0.15 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 22400, invoiceImage: "sales/INV-2026-002.pdf",
      date: dFixed(2026, 1, 12),
      items: [{ machineType: "PREFORM", size: "28g PET 28mm", quantity: 40000, pricePerUnit: 0.56 }],
    },
    {
      customerId: palBevId, soldById: adminId, totalAmount: 14200, invoiceImage: "sales/INV-2026-003.pdf",
      date: dFixed(2026, 1, 20),
      items: [{ machineType: "CAPS", size: "38mm Sport Cap", quantity: 71000, pricePerUnit: 0.20 }],
    },
    // February 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 21000, invoiceImage: "sales/INV-2026-004.pdf",
      date: dFixed(2026, 2, 5),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 140000, pricePerUnit: 0.15 }],
    },
    {
      customerId: alhayatId, soldById: adminId, totalAmount: 26400, invoiceImage: "sales/INV-2026-005.pdf",
      date: dFixed(2026, 2, 10),
      items: [{ machineType: "PREFORM", size: "32g PET 28mm", quantity: 44000, pricePerUnit: 0.60 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 19200, invoiceImage: "sales/INV-2026-006.pdf",
      date: dFixed(2026, 2, 18),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 96000, pricePerUnit: 0.20 }],
    },
    {
      customerId: alwafaId, soldById: adminId, totalAmount: 15750, invoiceImage: "sales/INV-2026-007.pdf",
      date: dFixed(2026, 2, 25),
      items: [{ machineType: "CAPS", size: "30mm Still Water", quantity: 90000, pricePerUnit: 0.175 }],
    },
    // March 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 24000, invoiceImage: "sales/INV-2026-008.pdf",
      date: dFixed(2026, 3, 4),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 160000, pricePerUnit: 0.15 }],
    },
    {
      customerId: alnourId, soldById: adminId, totalAmount: 18000, invoiceImage: "sales/INV-2026-009.pdf",
      date: dFixed(2026, 3, 9),
      items: [{ machineType: "CAPS", size: "30mm Sport Cap", quantity: 90000, pricePerUnit: 0.20 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 28600, invoiceImage: "sales/INV-2026-010.pdf",
      date: dFixed(2026, 3, 15),
      items: [{ machineType: "PREFORM", size: "28g PET 28mm", quantity: 52000, pricePerUnit: 0.55 }],
    },
    {
      customerId: dandanId, soldById: adminId, totalAmount: 11200, invoiceImage: "sales/INV-2026-011.pdf",
      date: dFixed(2026, 3, 22),
      items: [{ machineType: "CAPS", size: "38mm Sauce Cap", quantity: 56000, pricePerUnit: 0.20 }],
    },
    // April 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 27000, invoiceImage: "sales/INV-2026-012.pdf",
      date: dFixed(2026, 4, 2),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 180000, pricePerUnit: 0.15 }],
    },
    {
      customerId: alamalId, soldById: adminId, totalAmount: 16800, invoiceImage: "sales/INV-2026-013.pdf",
      date: dFixed(2026, 4, 8),
      items: [{ machineType: "CAPS", size: "30mm Sport Cap", quantity: 84000, pricePerUnit: 0.20 }],
    },
    {
      customerId: palBevId, soldById: adminId, totalAmount: 33000, invoiceImage: "sales/INV-2026-014.pdf",
      date: dFixed(2026, 4, 14),
      items: [{ machineType: "PREFORM", size: "32g PET 28mm", quantity: 55000, pricePerUnit: 0.60 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 21000, invoiceImage: "sales/INV-2026-015.pdf",
      date: dFixed(2026, 4, 22),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 140000, pricePerUnit: 0.15 }],
    },
    // May 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 31500, invoiceImage: "sales/INV-2026-016.pdf",
      date: dFixed(2026, 5, 5),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 210000, pricePerUnit: 0.15 }],
    },
    {
      customerId: alhayatId, soldById: adminId, totalAmount: 29700, invoiceImage: "sales/INV-2026-017.pdf",
      date: dFixed(2026, 5, 12),
      items: [{ machineType: "PREFORM", size: "28g PET 28mm", quantity: 54000, pricePerUnit: 0.55 }],
    },
    {
      customerId: alnourId, soldById: adminId, totalAmount: 22400, invoiceImage: "sales/INV-2026-018.pdf",
      date: dFixed(2026, 5, 19),
      items: [{ machineType: "CAPS", size: "30mm Sport Cap", quantity: 112000, pricePerUnit: 0.20 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 38500, invoiceImage: "sales/INV-2026-019.pdf",
      date: dFixed(2026, 5, 26),
      items: [{ machineType: "PREFORM", size: "32g PET 28mm", quantity: 55000, pricePerUnit: 0.70 }],
    },
    // June 2026
    {
      customerId: qudisId, soldById: adminId, totalAmount: 22500, invoiceImage: "sales/INV-2026-020.pdf",
      date: dFixed(2026, 6, 3),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 150000, pricePerUnit: 0.15 }],
    },
    {
      customerId: lamicoId, soldById: adminId, totalAmount: 17500, invoiceImage: "sales/INV-2026-021.pdf",
      date: dFixed(2026, 6, 7),
      items: [{ machineType: "CAPS", size: "28mm PCO-1881", quantity: 100000, pricePerUnit: 0.175 }],
    },
  ];

  for (const s of sales) {
    const exists = await prisma.sale.findFirst({
      where: { customerId: s.customerId, date: s.date, totalAmount: s.totalAmount },
      select: { id: true },
    });
    if (exists) { console.log(`Skipped existing sale ${s.invoiceImage}`); continue; }

    await prisma.sale.create({
      data: {
        customerId: s.customerId, soldById: s.soldById,
        totalAmount: s.totalAmount, invoiceImage: s.invoiceImage, date: s.date,
        items: { create: s.items },
      },
    });
    console.log(`Sale: ${s.invoiceImage} → ₪${s.totalAmount}`);
  }
}

// ─── 6. Invoices ──────────────────────────────────────────────────────────────
async function seedInvoices(accountantId: number, customerIds: Record<string, number>) {
  const qudisId = customerIds["شركة القدس للمياه"];
  const lamicoId = customerIds["لاميكو للتجارة العامة"];
  const palBevId = customerIds["شركة فلسطين للمشروبات"];
  const alhayatId = customerIds["مصنع الحياة للعصائر"];

  const invoices = [
    {
      invoiceNumber: "PLT-INV-2026-001", customerId: qudisId, createdById: accountantId,
      totalAmount: 18750, dueDate: dFixed(2026, 2, 8), paymentStatus: "PAID",
      issueDate: dFixed(2026, 1, 8), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "info@alqudswater.ps",
      notes: "فاتورة أغطية بلاستيكية 28mm PCO-1881",
      lineItems: JSON.stringify([{ description: "أغطية 28mm PCO-1881", quantity: 125000, unitPrice: 0.15, total: 18750 }]),
    },
    {
      invoiceNumber: "PLT-INV-2026-002", customerId: lamicoId, createdById: accountantId,
      totalAmount: 22400, dueDate: dFixed(2026, 2, 12), paymentStatus: "PAID",
      issueDate: dFixed(2026, 1, 12), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "lamico@lamico.ps",
      notes: "فاتورة بريفورم PET 28mm",
      lineItems: JSON.stringify([{ description: "بريفورم 28g PET 28mm", quantity: 40000, unitPrice: 0.56, total: 22400 }]),
    },
    {
      invoiceNumber: "PLT-INV-2026-003", customerId: qudisId, createdById: accountantId,
      totalAmount: 21000, dueDate: dFixed(2026, 3, 5), paymentStatus: "PAID",
      issueDate: dFixed(2026, 2, 5), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "info@alqudswater.ps",
      notes: "فاتورة شباط 2026",
      lineItems: JSON.stringify([{ description: "أغطية 28mm PCO-1881", quantity: 140000, unitPrice: 0.15, total: 21000 }]),
    },
    {
      invoiceNumber: "PLT-INV-2026-004", customerId: alhayatId, createdById: accountantId,
      totalAmount: 26400, dueDate: dFixed(2026, 3, 10), paymentStatus: "OVERDUE",
      issueDate: dFixed(2026, 2, 10), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "info@alhayatjuices.ps",
      notes: "بريفورم 32g",
      lineItems: JSON.stringify([{ description: "بريفورم 32g PET 28mm", quantity: 44000, unitPrice: 0.60, total: 26400 }]),
    },
    {
      invoiceNumber: "PLT-INV-2026-005", customerId: palBevId, createdById: accountantId,
      totalAmount: 33000, dueDate: dFixed(2026, 5, 14), paymentStatus: "PENDING",
      issueDate: dFixed(2026, 4, 14), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "sales@palbev.ps",
      notes: "بريفورم نيسان 2026",
      lineItems: JSON.stringify([{ description: "بريفورم 32g PET 28mm", quantity: 55000, unitPrice: 0.60, total: 33000 }]),
    },
    {
      invoiceNumber: "PLT-INV-2026-006", customerId: lamicoId, createdById: accountantId,
      totalAmount: 38500, dueDate: dFixed(2026, 6, 26), paymentStatus: "PENDING",
      issueDate: dFixed(2026, 5, 26), currency: "ILS",
      vendorName: "بلاستيكون لصناعة البلاستيك",
      vendorAddress: "رام الله - منطقة بيتونيا الصناعية",
      customerEmail: "lamico@lamico.ps",
      notes: "بريفورم أيار 2026",
      lineItems: JSON.stringify([{ description: "بريفورم 32g PET 28mm", quantity: 55000, unitPrice: 0.70, total: 38500 }]),
    },
  ];

  for (const inv of invoices) {
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: inv.invoiceNumber }, select: { id: true } });
    if (exists) { console.log(`Skipped invoice ${inv.invoiceNumber}`); continue; }
    await prisma.invoice.create({ data: inv });
    console.log(`Invoice: ${inv.invoiceNumber} — ₪${inv.totalAmount} [${inv.paymentStatus}]`);
  }
}

// ─── 7. Customer Receivables ───────────────────────────────────────────────────
async function seedReceivables(customerIds: Record<string, number>) {
  const receivables = [
    { customerId: customerIds["شركة القدس للمياه"],           amount: 22500, dueDate: dFixed(2026, 7, 3),  status: "PENDING", notes: "فاتورة حزيران 2026" },
    { customerId: customerIds["لاميكو للتجارة العامة"],       amount: 56000, dueDate: dFixed(2026, 6, 26), status: "PENDING", notes: "فاتورة أيار + حزيران" },
    { customerId: customerIds["شركة فلسطين للمشروبات"],       amount: 33000, dueDate: dFixed(2026, 5, 14), status: "OVERDUE", notes: "متأخرة 25 يوم" },
    { customerId: customerIds["مصنع الحياة للعصائر"],          amount: 26400, dueDate: dFixed(2026, 3, 10), status: "OVERDUE", notes: "مستحقة منذ آذار - مطلوب متابعة" },
    { customerId: customerIds["شركة الوفاء للمياه والعصائر"], amount: 15750, dueDate: dFixed(2026, 3, 25), status: "PAID",    notes: "تم الدفع" },
    { customerId: customerIds["مجموعة النور للتعبئة والتغليف"], amount: 18000, dueDate: dFixed(2026, 4, 9), status: "PAID",   notes: "تم الدفع نقداً" },
  ];

  for (const r of receivables) {
    const exists = await prisma.customerReceivable.findFirst({
      where: { customerId: r.customerId, amount: r.amount }, select: { id: true },
    });
    if (exists) { console.log(`Skipped receivable`); continue; }
    await prisma.customerReceivable.create({ data: r });
    console.log(`Receivable: ${r.amount} NIS [${r.status}]`);
  }
}

// ─── 8. Supplier Payables ─────────────────────────────────────────────────────
async function seedPayables(supplierIds: Record<string, number>) {
  const payables = [
    { supplierId: supplierIds["الشركة العربية للبتروكيماويات"],     amount: 36800, dueDate: dFixed(2026, 6, 22), paymentStatus: "PENDING", notes: "PO-2026-009" },
    { supplierId: supplierIds["مجموعة الشرق الأوسط للبوليمر"],    amount: 38400, dueDate: dFixed(2026, 6, 6),  paymentStatus: "PENDING", notes: "PO-2026-008" },
    { supplierId: supplierIds["شركة الأهلي للكيماويات - فلسطين"], amount: 5600,  dueDate: dFixed(2026, 5, 15), paymentStatus: "PAID",    notes: "مدفوعة" },
    { supplierId: supplierIds["الشركة العربية للبتروكيماويات"],     amount: 34500, dueDate: dFixed(2026, 5, 3),  paymentStatus: "PAID",    notes: "PO-2026-006 مدفوعة" },
    { supplierId: supplierIds["شركة الفلسطينية للمعدات الصناعية"], amount: 8200,  dueDate: dFixed(2026, 6, 15), paymentStatus: "PENDING", notes: "قطع غيار آلة الأغطية" },
  ];

  for (const p of payables) {
    const exists = await prisma.supplierPayable.findFirst({
      where: { supplierId: p.supplierId, amount: p.amount }, select: { id: true },
    });
    if (exists) { console.log(`Skipped payable`); continue; }
    await prisma.supplierPayable.create({ data: p });
    console.log(`Payable: ${p.amount} NIS [${p.paymentStatus}]`);
  }
}

// ─── 9. Expenses ──────────────────────────────────────────────────────────────
async function seedExpenses(accountantId: number) {
  const expenses = [
    { submittedById: accountantId, category: "UTILITIES",    amount: 12400, description: "فاتورة كهرباء - يناير 2026",  paymentStatus: "PAID",    submittedAt: dFixed(2026, 1, 31) },
    { submittedById: accountantId, category: "UTILITIES",    amount: 13100, description: "فاتورة كهرباء - فبراير 2026", paymentStatus: "PAID",    submittedAt: dFixed(2026, 2, 28) },
    { submittedById: accountantId, category: "UTILITIES",    amount: 11800, description: "فاتورة كهرباء - مارس 2026",  paymentStatus: "PAID",    submittedAt: dFixed(2026, 3, 31) },
    { submittedById: accountantId, category: "UTILITIES",    amount: 14200, description: "فاتورة كهرباء - أبريل 2026", paymentStatus: "PAID",    submittedAt: dFixed(2026, 4, 30) },
    { submittedById: accountantId, category: "UTILITIES",    amount: 15600, description: "فاتورة كهرباء - مايو 2026",  paymentStatus: "PENDING", submittedAt: dFixed(2026, 5, 31) },
    { submittedById: accountantId, category: "MAINTENANCE",  amount: 4800,  description: "صيانة آلة الأغطية 428sp - استبدال حزام", paymentStatus: "PAID", submittedAt: dFixed(2026, 2, 14) },
    { submittedById: accountantId, category: "MAINTENANCE",  amount: 7200,  description: "صيانة آلة البريفورم 430pet - رأس حقن",    paymentStatus: "PAID", submittedAt: dFixed(2026, 3, 20) },
    { submittedById: accountantId, category: "MAINTENANCE",  amount: 3500,  description: "تزييت وفحص دوري - آلات الإنتاج",           paymentStatus: "PAID", submittedAt: dFixed(2026, 4, 10) },
    { submittedById: accountantId, category: "OTHER",        amount: 2400,  description: "تجديد رخصة تشغيل المصنع",                   paymentStatus: "PAID", submittedAt: dFixed(2026, 1, 15) },
    { submittedById: accountantId, category: "OTHER",        amount: 1800,  description: "اشتراك برامج الإدارة السنوي",                paymentStatus: "PAID", submittedAt: dFixed(2026, 1, 5)  },
    { submittedById: accountantId, category: "TRAVEL",       amount: 950,   description: "مصاريف تنقل مندوبي المبيعات - يناير",       paymentStatus: "PAID", submittedAt: dFixed(2026, 1, 31) },
    { submittedById: accountantId, category: "TRAVEL",       amount: 1100,  description: "مصاريف تنقل مندوبي المبيعات - مارس",        paymentStatus: "PAID", submittedAt: dFixed(2026, 3, 31) },
    { submittedById: accountantId, category: "TRAVEL",       amount: 1250,  description: "مصاريف تنقل مندوبي المبيعات - مايو",        paymentStatus: "PENDING", submittedAt: dFixed(2026, 5, 31) },
    { submittedById: accountantId, category: "MATERIALS",    amount: 680,   description: "مواد تعبئة وتغليف إضافية",                   paymentStatus: "PAID", submittedAt: dFixed(2026, 2, 8)  },
    { submittedById: accountantId, category: "MATERIALS",    amount: 920,   description: "أكياس وطباعة ملصقات",                        paymentStatus: "PAID", submittedAt: dFixed(2026, 4, 5)  },
  ];

  for (const e of expenses) {
    const exists = await prisma.expense.findFirst({
      where: { submittedById: e.submittedById, description: e.description }, select: { id: true },
    });
    if (exists) { console.log(`Skipped expense: ${e.description}`); continue; }
    await prisma.expense.create({ data: { ...e, approvedById: e.paymentStatus === "PAID" ? accountantId : undefined, approvedAt: e.paymentStatus === "PAID" ? e.submittedAt : undefined } });
    console.log(`Expense: ${e.description} — ₪${e.amount}`);
  }
}

// ─── 10. Budget Plans ─────────────────────────────────────────────────────────
async function seedBudgetPlans(accountantId: number) {
  const plans = [
    // Jan 2026
    { month: "2026-01", category: "المواد الخام",         allocated: 95000, spent: 88500,  createdById: accountantId },
    { month: "2026-01", category: "الرواتب",              allocated: 48000, spent: 48000,  createdById: accountantId },
    { month: "2026-01", category: "الكهرباء والطاقة",    allocated: 15000, spent: 12400,  createdById: accountantId },
    { month: "2026-01", category: "الصيانة",              allocated: 8000,  spent: 0,      createdById: accountantId },
    { month: "2026-01", category: "التسويق والمبيعات",    allocated: 5000,  spent: 3200,   createdById: accountantId },
    // Feb 2026
    { month: "2026-02", category: "المواد الخام",         allocated: 95000, spent: 91200,  createdById: accountantId },
    { month: "2026-02", category: "الرواتب",              allocated: 48000, spent: 48000,  createdById: accountantId },
    { month: "2026-02", category: "الكهرباء والطاقة",    allocated: 15000, spent: 13100,  createdById: accountantId },
    { month: "2026-02", category: "الصيانة",              allocated: 8000,  spent: 4800,   createdById: accountantId },
    // Mar 2026
    { month: "2026-03", category: "المواد الخام",         allocated: 100000, spent: 96500, createdById: accountantId },
    { month: "2026-03", category: "الرواتب",              allocated: 48000,  spent: 48000, createdById: accountantId },
    { month: "2026-03", category: "الكهرباء والطاقة",    allocated: 15000,  spent: 11800, createdById: accountantId },
    { month: "2026-03", category: "الصيانة",              allocated: 10000,  spent: 7200,  createdById: accountantId },
    // Apr 2026
    { month: "2026-04", category: "المواد الخام",         allocated: 105000, spent: 102500, createdById: accountantId },
    { month: "2026-04", category: "الرواتب",              allocated: 50000,  spent: 50000,  createdById: accountantId },
    { month: "2026-04", category: "الكهرباء والطاقة",    allocated: 16000,  spent: 14200,  createdById: accountantId },
    { month: "2026-04", category: "الصيانة",              allocated: 8000,   spent: 3500,   createdById: accountantId },
    // May 2026
    { month: "2026-05", category: "المواد الخام",         allocated: 110000, spent: 108500, createdById: accountantId },
    { month: "2026-05", category: "الرواتب",              allocated: 50000,  spent: 50000,  createdById: accountantId },
    { month: "2026-05", category: "الكهرباء والطاقة",    allocated: 17000,  spent: 15600,  createdById: accountantId },
    { month: "2026-05", category: "الصيانة",              allocated: 10000,  spent: 0,      createdById: accountantId },
    // Jun 2026
    { month: "2026-06", category: "المواد الخام",         allocated: 115000, spent: 0,      createdById: accountantId },
    { month: "2026-06", category: "الرواتب",              allocated: 52000,  spent: 0,      createdById: accountantId },
    { month: "2026-06", category: "الكهرباء والطاقة",    allocated: 18000,  spent: 0,      createdById: accountantId },
  ];

  for (const p of plans) {
    const exists = await prisma.budgetPlan.findFirst({
      where: { month: p.month, category: p.category }, select: { id: true },
    });
    if (exists) { console.log(`Skipped budget: ${p.month} ${p.category}`); continue; }
    await prisma.budgetPlan.create({ data: p });
    console.log(`Budget: ${p.month} ${p.category}`);
  }
}

// ─── 11. Cost Analysis ────────────────────────────────────────────────────────
async function seedCostAnalysis() {
  const analyses = [
    { category: "المواد الخام",      cost: 108500, percentage: 58.2, period: "2026-05", notes: "HDPE, LDPE, PET, مواد مساعدة" },
    { category: "الرواتب والأجور",   cost: 50000,  percentage: 26.8, period: "2026-05", notes: "9 موظفين" },
    { category: "الكهرباء والطاقة", cost: 15600,  percentage: 8.4,  period: "2026-05", notes: "بما فيها تبريد وتدفئة" },
    { category: "الصيانة",          cost: 3500,   percentage: 1.9,  period: "2026-05", notes: "صيانة دورية" },
    { category: "التسويق والمبيعات", cost: 1250,   percentage: 0.7,  period: "2026-05", notes: "مصاريف مندوبين" },
    { category: "إدارية وعمومية",   cost: 7300,   percentage: 3.9,  period: "2026-05", notes: "إيجار، هاتف، مياه" },
    // April
    { category: "المواد الخام",      cost: 102500, percentage: 57.4, period: "2026-04", notes: "HDPE, LDPE, PET" },
    { category: "الرواتب والأجور",   cost: 50000,  percentage: 28.0, period: "2026-04", notes: "9 موظفين" },
    { category: "الكهرباء والطاقة", cost: 14200,  percentage: 7.9,  period: "2026-04" },
    { category: "الصيانة",          cost: 3500,   percentage: 2.0,  period: "2026-04" },
    { category: "إدارية وعمومية",   cost: 8300,   percentage: 4.6,  period: "2026-04" },
  ];

  for (const a of analyses) {
    const exists = await prisma.costAnalysis.findFirst({
      where: { period: a.period, category: a.category }, select: { id: true },
    });
    if (exists) { console.log(`Skipped cost analysis: ${a.period} ${a.category}`); continue; }
    await prisma.costAnalysis.create({ data: a });
    console.log(`Cost analysis: ${a.period} ${a.category}`);
  }
}

// ─── 12. Bank Reconciliation ──────────────────────────────────────────────────
async function seedBankReconciliation(accountantId: number) {
  const records = [
    { accountName: "البنك العربي - حساب التشغيل",       bankBalance: 284500, bookBalance: 281200, reconciled: true,  reconciledById: accountantId, notes: "مطابق - مايو 2026" },
    { accountName: "بنك فلسطين - حساب المبيعات",         bankBalance: 142300, bookBalance: 138900, reconciled: false, reconciledById: null,         notes: "فرق 3400 NIS قيد التحقق" },
    { accountName: "بنك القاهرة عمان - حساب الرواتب",   bankBalance: 52000,  bookBalance: 52000,  reconciled: true,  reconciledById: accountantId, notes: "مطابق تماماً" },
    { accountName: "البنك الوطني - حساب احتياطي",        bankBalance: 95000,  bookBalance: 95000,  reconciled: true,  reconciledById: accountantId, notes: "احتياطي طوارئ" },
  ];

  for (const r of records) {
    const exists = await prisma.bankReconciliation.findFirst({
      where: { accountName: r.accountName }, select: { id: true },
    });
    if (exists) { console.log(`Skipped bank: ${r.accountName}`); continue; }
    await prisma.bankReconciliation.create({ data: r });
    console.log(`Bank: ${r.accountName}`);
  }
}

// ─── 13. Tax Filings ──────────────────────────────────────────────────────────
async function seedTaxFilings(accountantId: number) {
  const filings = [
    { filingType: "ضريبة القيمة المضافة Q1",   dueDate: dFixed(2026, 4, 30), amount: 28400, status: "FILED", filedById: accountantId },
    { filingType: "ضريبة القيمة المضافة Q2",   dueDate: dFixed(2026, 7, 31), amount: 31200, status: "PENDING", filedById: null },
    { filingType: "ضريبة الدخل السنوية 2025",  dueDate: dFixed(2026, 3, 31), amount: 45600, status: "PAID",   filedById: accountantId },
    { filingType: "ضريبة الرواتب - يناير 2026", dueDate: dFixed(2026, 2, 15), amount: 4800,  status: "PAID",  filedById: accountantId },
    { filingType: "ضريبة الرواتب - فبراير 2026", dueDate: dFixed(2026, 3, 15), amount: 4800, status: "PAID",  filedById: accountantId },
    { filingType: "ضريبة الرواتب - مارس 2026",  dueDate: dFixed(2026, 4, 15), amount: 4800, status: "PAID",  filedById: accountantId },
    { filingType: "ضريبة الرواتب - أبريل 2026", dueDate: dFixed(2026, 5, 15), amount: 5000, status: "PAID",  filedById: accountantId },
    { filingType: "ضريبة الرواتب - مايو 2026",  dueDate: dFixed(2026, 6, 15), amount: 5000, status: "PENDING", filedById: null },
  ];

  for (const f of filings) {
    const exists = await prisma.taxFiling.findFirst({ where: { filingType: f.filingType }, select: { id: true } });
    if (exists) { console.log(`Skipped tax: ${f.filingType}`); continue; }
    await prisma.taxFiling.create({ data: f });
    console.log(`Tax filing: ${f.filingType}`);
  }
}

// ─── 14. Approval Workflows ───────────────────────────────────────────────────
async function seedApprovalWorkflows(accountantId: number) {
  const workflows = [
    { workflowName: "موافقة المشتريات",         status: "ACTIVE",   itemsCount: 12, approverCount: 2, createdById: accountantId },
    { workflowName: "موافقة المصروفات",          status: "ACTIVE",   itemsCount: 8,  approverCount: 2, createdById: accountantId },
    { workflowName: "موافقة عروض الأسعار",       status: "ACTIVE",   itemsCount: 6,  approverCount: 1, createdById: accountantId },
    { workflowName: "موافقة الرواتب الشهرية",   status: "ACTIVE",   itemsCount: 9,  approverCount: 1, createdById: accountantId },
    { workflowName: "موافقة طلبات قطع الغيار",  status: "DRAFT",    itemsCount: 0,  approverCount: 2, createdById: accountantId },
  ];

  for (const w of workflows) {
    const exists = await prisma.approvalWorkflow.findFirst({ where: { workflowName: w.workflowName }, select: { id: true } });
    if (exists) { console.log(`Skipped workflow: ${w.workflowName}`); continue; }
    await prisma.approvalWorkflow.create({ data: w });
    console.log(`Workflow: ${w.workflowName}`);
  }
}

// ─── 15. Sales Rep data (Quotations, Visits, Targets) ─────────────────────────
async function seedSalesRepData(repId: number, customerIds: Record<string, number>) {
  const qudisId = customerIds["شركة القدس للمياه"];
  const lamicoId = customerIds["لاميكو للتجارة العامة"];
  const palBevId = customerIds["شركة فلسطين للمشروبات"];
  const alnourId = customerIds["مجموعة النور للتعبئة والتغليف"];
  const alamalId = customerIds["شركة الأمل للتوزيع"];

  // Sales Targets
  const targets = [
    { repId, month: 1, year: 2026, targetAmount: 80000, achievedAmount: 55350, notes: "هدف يناير" },
    { repId, month: 2, year: 2026, targetAmount: 85000, achievedAmount: 79950, notes: "هدف فبراير" },
    { repId, month: 3, year: 2026, targetAmount: 90000, achievedAmount: 88000, notes: "هدف مارس" },
    { repId, month: 4, year: 2026, targetAmount: 95000, achievedAmount: 97800, notes: "تجاوز الهدف - أبريل" },
    { repId, month: 5, year: 2026, targetAmount: 100000, achievedAmount: 101700, notes: "تجاوز الهدف - مايو" },
    { repId, month: 6, year: 2026, targetAmount: 105000, achievedAmount: 40000, notes: "الشهر جارٍ" },
  ];
  for (const t of targets) {
    await prisma.salesTarget.upsert({
      where: { repId_month_year: { repId: t.repId, month: t.month, year: t.year } },
      update: { achievedAmount: t.achievedAmount, notes: t.notes },
      create: t,
    });
    console.log(`Target: ${t.year}-${String(t.month).padStart(2,"0")} ₪${t.targetAmount}`);
  }

  // Quotations
  const quotations = [
    {
      customerId: qudisId, createdById: repId, status: "ACCEPTED" as const,
      notes: "طلب موسمي - صيف 2026، توريد منتظم كل شهر",
      validUntil: dFixed(2026, 8, 1), totalAmount: 45000,
      items: [
        { productType: "CAPS", size: "28mm PCO-1881", quantity: 200000, pricePerUnit: 0.15 },
        { productType: "CAPS", size: "30mm Still Water", quantity: 100000, pricePerUnit: 0.15 },
      ],
    },
    {
      customerId: lamicoId, createdById: repId, status: "SENT" as const,
      notes: "عرض بريفورم بكميات كبيرة - Q3 2026",
      validUntil: dFixed(2026, 7, 15), totalAmount: 77000,
      items: [
        { productType: "PREFORM", size: "28g PET 28mm", quantity: 100000, pricePerUnit: 0.56 },
        { productType: "PREFORM", size: "32g PET 28mm", quantity: 60000, pricePerUnit: 0.60 },
      ],
    },
    {
      customerId: palBevId, createdById: repId, status: "DRAFT" as const,
      notes: "عرض لنوع جديد من الأغطية الرياضية",
      validUntil: dFixed(2026, 7, 30), totalAmount: 28000,
      items: [
        { productType: "CAPS", size: "38mm Sport Cap", quantity: 140000, pricePerUnit: 0.20 },
      ],
    },
    {
      customerId: alnourId, createdById: repId, status: "ACCEPTED" as const,
      notes: "عقد ربع سنوي",
      validUntil: dFixed(2026, 9, 1), totalAmount: 54000,
      items: [
        { productType: "CAPS", size: "30mm Sport Cap", quantity: 270000, pricePerUnit: 0.20 },
      ],
    },
    {
      customerId: alamalId, createdById: repId, status: "REJECTED" as const,
      notes: "رفض بسبب السعر - مطلوب إعادة التسعير",
      validUntil: dFixed(2026, 7, 1), totalAmount: 12000,
      items: [
        { productType: "CAPS", size: "28mm PCO-1881", quantity: 80000, pricePerUnit: 0.15 },
      ],
    },
    {
      customerId: qudisId, createdById: repId, status: "SENT" as const,
      notes: "عرض إضافي لأغطية بيضاء - أغسطس",
      validUntil: dFixed(2026, 8, 15), totalAmount: 30000,
      items: [
        { productType: "CAPS", size: "28mm PCO-1881", quantity: 200000, pricePerUnit: 0.15 },
      ],
    },
  ];

  for (const q of quotations) {
    const exists = await prisma.quotation.findFirst({
      where: { customerId: q.customerId, createdById: q.createdById, totalAmount: q.totalAmount },
      select: { id: true },
    });
    if (exists) { console.log(`Skipped quotation`); continue; }
    await prisma.quotation.create({
      data: {
        customerId: q.customerId, createdById: q.createdById,
        status: q.status, notes: q.notes, validUntil: q.validUntil, totalAmount: q.totalAmount,
        items: { create: q.items },
      },
    });
    console.log(`Quotation: ${q.status} ₪${q.totalAmount}`);
  }

  // Customer Visits
  const visits = [
    { customerId: qudisId,  loggedById: repId, visitDate: dFixed(2026, 1, 10), outcome: "اتفاق على الكميات الشهرية", notes: "زيارة أولى للتعارف وعرض منتجاتنا، نتيجة إيجابية جداً. العميل مهتم بزيادة الكميات.", nextVisitAt: dFixed(2026, 2, 10) },
    { customerId: lamicoId, loggedById: repId, visitDate: dFixed(2026, 1, 15), outcome: "قيد الدراسة", notes: "اجتماع مع مدير المشتريات، طلب عينات وكتالوج أسعار.", nextVisitAt: dFixed(2026, 2, 1) },
    { customerId: qudisId,  loggedById: repId, visitDate: dFixed(2026, 2, 12), outcome: "توقيع عقد", notes: "توقيع عقد توريد لمدة 6 أشهر. ₪150,000 قيمة العقد الإجمالية.", nextVisitAt: dFixed(2026, 3, 12) },
    { customerId: lamicoId, loggedById: repId, visitDate: dFixed(2026, 2, 5), outcome: "اتفاق - طلب عرض سعر رسمي", notes: "قبلوا العينات والجودة ممتازة. انتظار عرض الأسعار للبريفورم.", nextVisitAt: dFixed(2026, 2, 20) },
    { customerId: palBevId, loggedById: repId, visitDate: dFixed(2026, 2, 20), outcome: "قيد الدراسة", notes: "أول زيارة. اهتمام بالأغطية الرياضية للعبوات الجديدة.", nextVisitAt: dFixed(2026, 3, 15) },
    { customerId: alnourId, loggedById: repId, visitDate: dFixed(2026, 3, 5), outcome: "اتفاق - ربع سنوي", notes: "اتفاق على إمداد ربع سنوي بأغطية Sport Cap. عقد جيد.", nextVisitAt: dFixed(2026, 6, 5) },
    { customerId: qudisId,  loggedById: repId, visitDate: dFixed(2026, 3, 14), outcome: "مراجعة طلب - زيادة كميات", notes: "طلب زيادة الكميات الشهرية. جاري مراجعة طاقة الإنتاج.", nextVisitAt: dFixed(2026, 4, 14) },
    { customerId: lamicoId, loggedById: repId, visitDate: dFixed(2026, 3, 22), outcome: "توقيع عقد البريفورم", notes: "توقيع عقد توريد البريفورم. بداية من أبريل.", nextVisitAt: dFixed(2026, 4, 22) },
    { customerId: alamalId, loggedById: repId, visitDate: dFixed(2026, 4, 2), outcome: "رفض السعر", notes: "العميل يرى أن سعرنا مرتفع 15% عن المنافسين. مطلوب مراجعة هيكل التسعير.", nextVisitAt: dFixed(2026, 5, 2) },
    { customerId: qudisId,  loggedById: repId, visitDate: dFixed(2026, 4, 16), outcome: "موافقة على الزيادة", notes: "تمت الموافقة على زيادة الكميات الشهرية من 140,000 إلى 200,000 غطاء.", nextVisitAt: dFixed(2026, 5, 16) },
    { customerId: palBevId, loggedById: repId, visitDate: dFixed(2026, 5, 8), outcome: "طلب عينات جديدة", notes: "مدير الإنتاج طلب عينات Sport Cap بألوان مختلفة.", nextVisitAt: dFixed(2026, 5, 25) },
    { customerId: lamicoId, loggedById: repId, visitDate: dFixed(2026, 5, 20), outcome: "متابعة الطلب", notes: "مراجعة جودة التسليم السابق. رضا تام. تجديد العقد لربع قادم.", nextVisitAt: dFixed(2026, 6, 20) },
    { customerId: qudisId,  loggedById: repId, visitDate: dFixed(2026, 6, 4), outcome: "اتفاق موسم الصيف", notes: "اتفاق على كميات موسم الصيف: 210,000 غطاء شهرياً يونيو-أغسطس.", nextVisitAt: dFixed(2026, 7, 4) },
  ];

  for (const v of visits) {
    const exists = await prisma.customerVisit.findFirst({
      where: { customerId: v.customerId, loggedById: v.loggedById, visitDate: v.visitDate },
      select: { id: true },
    });
    if (exists) { console.log(`Skipped visit`); continue; }
    await prisma.customerVisit.create({ data: v });
    console.log(`Visit: ${v.outcome}`);
  }
}

// ─── 16. Machine Health + Maintenance Schedules ───────────────────────────────
async function seedEngineerData(engineerId: number) {
  const machine1 = await prisma.machine.findFirst({ where: { type: "CAPS" }, select: { id: true } });
  const machine2 = await prisma.machine.findFirst({ where: { type: "PREFORM" }, select: { id: true } });
  if (!machine1 || !machine2) { console.log("No machines found, skipping engineer data"); return; }

  // Machine Health Records
  const healthRecords = [
    { machineId: machine1.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 2.5,  maintenanceHours: 4,  efficiencyRating: 94, notes: "أداء ممتاز - يناير", recordedAt: dFixed(2026, 1, 31) },
    { machineId: machine2.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 4.0,  maintenanceHours: 6,  efficiencyRating: 88, notes: "توقف مؤقت لاستبدال فلتر", recordedAt: dFixed(2026, 1, 31) },
    { machineId: machine1.id, recordedById: engineerId, operationalStatus: "MAINTENANCE",  downtimePercentage: 8.0,  maintenanceHours: 16, efficiencyRating: 82, notes: "استبدال حزام نقل", recordedAt: dFixed(2026, 2, 14) },
    { machineId: machine2.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 3.0,  maintenanceHours: 5,  efficiencyRating: 90, notes: "فبراير - طبيعي", recordedAt: dFixed(2026, 2, 28) },
    { machineId: machine1.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 1.5,  maintenanceHours: 3,  efficiencyRating: 96, notes: "بعد الصيانة - ممتاز", recordedAt: dFixed(2026, 3, 31) },
    { machineId: machine2.id, recordedById: engineerId, operationalStatus: "MAINTENANCE",  downtimePercentage: 10.0, maintenanceHours: 20, efficiencyRating: 78, notes: "صيانة رأس حقن - مارس", recordedAt: dFixed(2026, 3, 20) },
    { machineId: machine1.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 2.0,  maintenanceHours: 4,  efficiencyRating: 95, notes: "أبريل - طبيعي", recordedAt: dFixed(2026, 4, 30) },
    { machineId: machine2.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 2.5,  maintenanceHours: 5,  efficiencyRating: 93, notes: "أبريل - طبيعي", recordedAt: dFixed(2026, 4, 30) },
    { machineId: machine1.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 1.8,  maintenanceHours: 3,  efficiencyRating: 97, notes: "مايو - أفضل شهر", recordedAt: dFixed(2026, 5, 31) },
    { machineId: machine2.id, recordedById: engineerId, operationalStatus: "OPERATIONAL", downtimePercentage: 2.2,  maintenanceHours: 4,  efficiencyRating: 95, notes: "مايو - ممتاز", recordedAt: dFixed(2026, 5, 31) },
  ];

  for (const h of healthRecords) {
    const exists = await prisma.machineHealthRecord.findFirst({
      where: { machineId: h.machineId, recordedAt: h.recordedAt }, select: { id: true },
    });
    if (exists) { console.log(`Skipped health record`); continue; }
    await prisma.machineHealthRecord.create({ data: h });
    console.log(`Health record: M${h.machineId} ${h.efficiencyRating}% efficiency`);
  }

  // Maintenance Schedules
  const schedules = [
    { machineId: machine1.id, assignedEngineerId: engineerId, createdById: engineerId, scheduleType: "PREVENTIVE", frequency: "MONTHLY", nextScheduledDate: dFixed(2026, 7, 1), status: "PENDING", description: "فحص شهري لآلة الأغطية: حزام، زيت، فلاتر" },
    { machineId: machine2.id, assignedEngineerId: engineerId, createdById: engineerId, scheduleType: "PREVENTIVE", frequency: "MONTHLY", nextScheduledDate: dFixed(2026, 7, 1), status: "PENDING", description: "فحص شهري لآلة البريفورم: رأس حقن، مسامير، مبردات" },
    { machineId: machine1.id, assignedEngineerId: engineerId, createdById: engineerId, scheduleType: "PREVENTIVE", frequency: "QUARTERLY", nextScheduledDate: dFixed(2026, 9, 1), status: "PENDING", description: "فحص ربع سنوي شامل - آلة الأغطية" },
    { machineId: machine2.id, assignedEngineerId: engineerId, createdById: engineerId, scheduleType: "PREVENTIVE", frequency: "QUARTERLY", nextScheduledDate: dFixed(2026, 9, 1), status: "PENDING", description: "فحص ربع سنوي شامل - آلة البريفورم" },
    { machineId: machine1.id, assignedEngineerId: engineerId, createdById: engineerId, scheduleType: "CORRECTIVE", frequency: "WEEKLY", nextScheduledDate: d(3), status: "PENDING", description: "متابعة اهتزاز في محرك الضاغط" },
  ];

  for (const s of schedules) {
    const exists = await prisma.maintenanceSchedule.findFirst({
      where: { machineId: s.machineId, description: s.description }, select: { id: true },
    });
    if (exists) { console.log(`Skipped schedule`); continue; }
    await prisma.maintenanceSchedule.create({ data: s });
    console.log(`Schedule: M${s.machineId} ${s.scheduleType}`);
  }

  // Spare Parts
  const spareParts = [
    { machineId: machine1.id, name: "حزام نقل رئيسي 428sp",       quantity: 3,  minQuantity: 1, unitPrice: 380,  supplier: "شركة الفلسطينية للمعدات الصناعية", lastRestockedDate: dFixed(2026, 2, 20) },
    { machineId: machine1.id, name: "مسمار ضبط قالب الغطاء",       quantity: 12, minQuantity: 4, unitPrice: 45,   supplier: "شركة الفلسطينية للمعدات الصناعية" },
    { machineId: machine1.id, name: "فلتر هواء ضاغط",              quantity: 6,  minQuantity: 2, unitPrice: 120,  supplier: "شركة طاقة فلسطين للخدمات" },
    { machineId: machine1.id, name: "زيت تشحيم صناعي 20L",         quantity: 4,  minQuantity: 2, unitPrice: 220,  supplier: "شركة الأهلي للكيماويات - فلسطين" },
    { machineId: machine2.id, name: "رأس حقن 430pet كامل",          quantity: 1,  minQuantity: 1, unitPrice: 2800, supplier: "شركة الفلسطينية للمعدات الصناعية", lastRestockedDate: dFixed(2026, 3, 25) },
    { machineId: machine2.id, name: "إبرة حقن BM28",                quantity: 8,  minQuantity: 3, unitPrice: 95,   supplier: "شركة الفلسطينية للمعدات الصناعية" },
    { machineId: machine2.id, name: "مبرد مياه دائري",              quantity: 2,  minQuantity: 1, unitPrice: 650,  supplier: "شركة طاقة فلسطين للخدمات" },
    { machineId: machine2.id, name: "حساس درجة الحرارة PT100",      quantity: 4,  minQuantity: 2, unitPrice: 180,  supplier: "شركة الفلسطينية للمعدات الصناعية" },
  ];

  for (const sp of spareParts) {
    const exists = await prisma.sparePart.findFirst({
      where: { machineId: sp.machineId, name: sp.name }, select: { id: true },
    });
    if (exists) { console.log(`Skipped spare part`); continue; }
    await prisma.sparePart.create({ data: sp });
    console.log(`Spare part: ${sp.name}`);
  }
}

// ─── 17. Financial Report ─────────────────────────────────────────────────────
async function seedFinancialReports(accountantId: number) {
  const reports = [
    { title: "تقرير الأرباح والخسائر - Q1 2026",   reportType: "P&L",           period: "Q1 2026",    generatedById: accountantId },
    { title: "الميزانية العمومية - مارس 2026",      reportType: "BalanceSheet",  period: "March 2026", generatedById: accountantId },
    { title: "تقرير التدفق النقدي - أبريل 2026",   reportType: "CashFlow",      period: "April 2026", generatedById: accountantId },
    { title: "تقرير المبيعات الشهري - مايو 2026",  reportType: "Sales",         period: "May 2026",   generatedById: accountantId },
    { title: "تقرير تكاليف الإنتاج - Q1 2026",     reportType: "CostAnalysis",  period: "Q1 2026",    generatedById: accountantId },
  ];

  for (const r of reports) {
    const exists = await prisma.financialReport.findFirst({ where: { title: r.title }, select: { id: true } });
    if (exists) { console.log(`Skipped report: ${r.title}`); continue; }
    await prisma.financialReport.create({ data: r });
    console.log(`Report: ${r.title}`);
  }
}

// ─── 18. Update Raw Material quantities ───────────────────────────────────────
async function updateRawMaterials() {
  const updates = [
    { name: "HDPE",         currentQuantity: 4200, minQuantity: 1000 },
    { name: "LDPE",         currentQuantity: 1800, minQuantity: 500 },
    { name: "PET",          currentQuantity: 3500, minQuantity: 800 },
    { name: "ADHESIVE",     currentQuantity: 380,  minQuantity: 100 },
    { name: "COLOR",        currentQuantity: 290,  minQuantity: 80 },
    { name: "EMPTY_BAGS",   currentQuantity: 1200, minQuantity: 200 },
    { name: "Preform (PET)", currentQuantity: 5000, minQuantity: 500 },
    { name: "Caps",          currentQuantity: 8000, minQuantity: 1000 },
  ];
  for (const u of updates) {
    const m = await prisma.rawMaterial.findFirst({ where: { name: u.name }, select: { id: true } });
    if (!m) continue;
    await prisma.rawMaterial.update({ where: { id: m.id }, data: { currentQuantity: u.currentQuantity, minQuantity: u.minQuantity } });
    console.log(`Material ${u.name}: ${u.currentQuantity} units`);
  }
}

// ─── 19. Salary Config ─────────────────────────────────────────────────────────
async function seedSalaryConfig(adminId: number) {
  const configs = [
    { role: UserRole.WORKER,     monthlySalary: 3200 },
    { role: UserRole.ENGINEER,   monthlySalary: 6500 },
    { role: UserRole.ACCOUNTANT, monthlySalary: 5800 },
    { role: UserRole.ADMIN,      monthlySalary: 8500 },
    { role: UserRole.SALES_REP,  monthlySalary: 4200 },
  ];
  for (const c of configs) {
    await prisma.salaryConfig.upsert({
      where: { role: c.role },
      update: { monthlySalary: c.monthlySalary, updatedById: adminId },
      create: { ...c, updatedById: adminId },
    });
    console.log(`Salary config: ${c.role} = ₪${c.monthlySalary}`);
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🏭 Seeding Plasticon real Palestinian data...\n");

  await seedRealUsers();

  // Get key user IDs
  const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN, username: { in: ["m.aburamadan", "admin"] } }, select: { id: true } });
  const accountant = await prisma.user.findFirst({ where: { role: UserRole.ACCOUNTANT }, select: { id: true } });
  const engineer = await prisma.user.findFirst({ where: { role: UserRole.ENGINEER }, select: { id: true } });
  const salesRep = await prisma.user.findFirst({ where: { role: UserRole.SALES_REP, username: "t.salameh" }, select: { id: true } });

  if (!admin || !accountant || !engineer || !salesRep) {
    throw new Error("Required users not found — run main seed first (npx prisma db seed)");
  }

  const customerIds = await seedCustomers(salesRep.id);
  const supplierIds = await seedSuppliers();

  await updateRawMaterials();
  await seedSalaryConfig(admin.id);
  await seedPurchases(admin.id, supplierIds);
  await seedSales(admin.id, customerIds);
  await seedInvoices(accountant.id, customerIds);
  await seedReceivables(customerIds);
  await seedPayables(supplierIds);
  await seedExpenses(accountant.id);
  await seedBudgetPlans(accountant.id);
  await seedCostAnalysis();
  await seedBankReconciliation(accountant.id);
  await seedTaxFilings(accountant.id);
  await seedApprovalWorkflows(accountant.id);
  await seedSalesRepData(salesRep.id, customerIds);
  await seedEngineerData(engineer.id);
  await seedFinancialReports(accountant.id);

  console.log("\n✅ Real data seed completed!\n");
  console.log("Companies seeded:");
  console.log("  Customers: شركة القدس للمياه، لاميكو للتجارة العامة، فلسطين للمشروبات + 5 more");
  console.log("  Suppliers: الشركة العربية للبتروكيماويات، مجموعة الشرق الأوسط للبوليمر + 3 more");
  console.log("  Sales: 21 sale records (Jan–Jun 2026)");
  console.log("  Purchases: 9 purchase orders");
  console.log("  Quotations: 6 | Visits: 13 | Targets: 6 months");
  console.log(`  Login: any new user with password ${PASS}`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
