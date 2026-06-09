import "dotenv/config";
import bcrypt from "bcrypt";
import {
  InventoryAuditFrequency,
  ProductType,
  UserRole,
} from "../src/config/generated/prisma/client";
import { prisma } from "../src/config/lib/prisma";

type SeedMachine = {
  name: string;
  type: string;
};

type SeedUser = {
  nationalId: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password?: string;
  role: UserRole;
  shiftName?: string;
};

const defaultMachines: SeedMachine[] = [
  { name: "Caps Line 428sp", type: "CAPS" },
  { name: "Preform Line 430pet", type: "PREFORM" },
];

const defaultUsers: SeedUser[] = [
  {
    nationalId: "999900001",
    fullName: "Admin User",
    username: "admin",
    phone: "0599000001",
    email: "admin@plasticon.local",
    role: UserRole.ADMIN,
  },
  {
    nationalId: "999900002",
    fullName: "Worker User",
    username: "worker",
    phone: "0599000002",
    email: "worker@plasticon.local",
    role: UserRole.WORKER,
    shiftName: "B",
  },
  {
    nationalId: "999900003",
    fullName: "Engineer User",
    username: "engineer",
    phone: "0599000003",
    email: "engineer@plasticon.local",
    role: UserRole.ENGINEER,
    shiftName: "B",
  },
  {
    nationalId: "999900004",
    fullName: "Accountant User",
    username: "accountant",
    phone: "0599000004",
    email: "accountant@plasticon.local",
    role: UserRole.ACCOUNTANT,
    shiftName: "B",
  },
  {
    nationalId: "999900005",
    fullName: "Sales Rep User",
    username: "salesrep",
    phone: "0599000005",
    email: "salesrep@plasticon.local",
    role: UserRole.SALES_REP,
  },
];

const defaultRawMaterials = [
  "HDPE",
  "LDPE",
  "PET",
  "ADHESIVE",
  "EMPTY_BAGS",
  "COLOR",
  "Preform (PET)",
  "Caps",
];

const DEFAULT_TEST_PASSWORD = "Pass1234!";
const BCRYPT_SALT_ROUNDS = 12;

const todayAt = (hour: number, minute: number) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

async function seedShifts() {
  const shifts = [
    { name: "A", startTime: todayAt(0, 0), endTime: todayAt(8, 0) },
    { name: "B", startTime: todayAt(8, 0), endTime: todayAt(16, 0) },
    { name: "C", startTime: todayAt(16, 0), endTime: todayAt(23, 59) },
  ];

  for (const shift of shifts) {
    const existing = await prisma.shift.findFirst({
      where: { name: shift.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.shift.update({
        where: { id: existing.id },
        data: {
          startTime: shift.startTime,
          endTime: shift.endTime,
        },
      });
      console.log(`Updated shift: ${shift.name}`);
      continue;
    }

    await prisma.shift.create({ data: shift });
    console.log(`Created shift: ${shift.name}`);
  }
}

async function seedProductionSettings(adminId: number | null) {
  await prisma.productionSetting.upsert({
    where: { productType: ProductType.CAPS },
    update: { piecesPerCarton: 10, updatedById: adminId },
    create: {
      productType: ProductType.CAPS,
      piecesPerCarton: 10,
      updatedById: adminId,
    },
  });

  await prisma.productionSetting.upsert({
    where: { productType: ProductType.PREFORM },
    update: { piecesPerCarton: 10, updatedById: adminId },
    create: {
      productType: ProductType.PREFORM,
      piecesPerCarton: 10,
      updatedById: adminId,
    },
  });

  console.log("Production settings seeded.");
}

async function seedSystemSetting(adminId: number | null) {
  const existing = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const data = {
    qualityCheckIntervalMinutes: 120,
    qualityCheckReminderMinutes: 60,
    inventoryAuditFrequency: InventoryAuditFrequency.DAILY,
    shiftEndReminderMinutes: 20,
    weeklyReportDayOfWeek: 1,
    weeklyReportTime: "09:00",
    monthlyReportDayOfMonth: 1,
    monthlyReportTime: "09:00",
    updatedById: adminId,
  };

  if (existing) {
    await prisma.systemSetting.update({ where: { id: existing.id }, data });
    console.log("Updated system setting.");
    return;
  }

  await prisma.systemSetting.create({ data });
  console.log("Created system setting.");
}

async function seedMachines() {
  for (const machine of defaultMachines) {
    const exists = await prisma.machine.findFirst({
      where: {
        name: machine.name,
        type: machine.type,
      },
      select: { id: true },
    });

    if (exists) {
      console.log(
        `Skipped existing machine: ${machine.name} (${machine.type})`,
      );
      continue;
    }

    const created = await prisma.machine.create({
      data: machine,
      select: { id: true, name: true, type: true },
    });

    console.log(
      `Created machine #${created.id}: ${created.name} (${created.type})`,
    );
  }
}

async function seedUsers() {
  for (const user of defaultUsers) {
    const userPassword = user.password || DEFAULT_TEST_PASSWORD;
    const hashedPassword = await bcrypt.hash(userPassword, BCRYPT_SALT_ROUNDS);

    const shift = user.shiftName
      ? await prisma.shift.findFirst({
          where: { name: user.shiftName },
          select: { id: true },
        })
      : null;

    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        nationalId: user.nationalId,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        shiftId: shift?.id ?? null,
        isActive: true,
        password: hashedPassword,
      },
      create: {
        nationalId: user.nationalId,
        fullName: user.fullName,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
        shiftId: shift?.id ?? null,
        isActive: true,
        password: hashedPassword,
      },
    });

    console.log(`Upserted user: ${user.username} (${user.role})`);
  }
}

async function seedRawMaterials() {
  for (const materialName of defaultRawMaterials) {
    const existing = await prisma.rawMaterial.findFirst({
      where: { name: materialName },
      select: { id: true },
    });

    if (existing) {
      await prisma.rawMaterial.update({
        where: { id: existing.id },
        data: { unit: "CARTON" },
      });
      console.log(`Updated raw material: ${materialName}`);
      continue;
    }

    await prisma.rawMaterial.create({
      data: {
        name: materialName,
        currentQuantity: 200,
        unit: "CARTON",
      },
    });
    console.log(`Created raw material: ${materialName}`);
  }
}

async function seedSupplierAndCustomer() {
  const supplierName = "Default Supplier";
  const customerName = "Default Customer";

  const supplierExists = await prisma.supplier.findFirst({
    where: { name: supplierName },
    select: { id: true },
  });

  if (!supplierExists) {
    await prisma.supplier.create({
      data: {
        name: supplierName,
        phone: "0599000010",
        email: "supplier@plasticon.local",
        address: "Palestine",
      },
    });
    console.log("Created default supplier.");
  }

  const customerExists = await prisma.customer.findFirst({
    where: { name: customerName },
    select: { id: true },
  });

  if (!customerExists) {
    await prisma.customer.create({
      data: {
        name: customerName,
        phone: "0599000020",
        email: "customer@plasticon.local",
        address: "Palestine",
      },
    });
    console.log("Created default customer.");
  }
}

async function seedSampleProduction() {
  const worker = await prisma.user.findUnique({
    where: { username: "worker1" },
    select: { id: true, shiftId: true },
  });
  const capsMachine = await prisma.machine.findFirst({
    where: { type: "CAPS" },
    select: { id: true },
  });
  const capsSetting = await prisma.productionSetting.findUnique({
    where: { productType: ProductType.CAPS },
    select: { piecesPerCarton: true },
  });

  if (!worker || !capsMachine || !worker.shiftId || !capsSetting) {
    console.log(
      "Skipped sample production record (missing user/shift/machine/settings).",
    );
    return;
  }

  const existing = await prisma.productionRecord.findFirst({
    where: {
      userId: worker.id,
      machineId: capsMachine.id,
      notes: "seed-sample-production",
    },
    select: { id: true },
  });

  if (existing) {
    console.log("Skipped existing sample production record.");
    return;
  }

  const cartonsCount = 12;
  await prisma.productionRecord.create({
    data: {
      userId: worker.id,
      machineId: capsMachine.id,
      shiftId: worker.shiftId,
      hourSlot: "08:00-10:00",
      cartonsCount,
      piecesPerCarton: capsSetting.piecesPerCarton,
      totalPieces: cartonsCount * capsSetting.piecesPerCarton,
      rawHdpeUsed: 1,
      adhesiveUsed: 0.5,
      downtimeReason: "seed test stop",
      downtimeMinutes: 10,
      notes: "seed-sample-production",
    },
  });

  console.log("Created sample production record.");
}

async function main() {
  console.log("Seeding test data...");
  await seedShifts();
  await seedUsers();

  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { id: true },
  });

  await seedMachines();
  await seedProductionSettings(admin?.id ?? null);
  await seedSystemSetting(admin?.id ?? null);
  await seedRawMaterials();
  await seedSupplierAndCustomer();
  await seedSampleProduction();

  console.log("Seed completed.");
  console.log("Test accounts password:", DEFAULT_TEST_PASSWORD);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
