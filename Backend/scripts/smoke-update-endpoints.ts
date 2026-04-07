import "dotenv/config";
import jwt from "jsonwebtoken";
import { prisma } from "../src/config/lib/prisma";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not set");
}

const run = async () => {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, role: true },
    orderBy: { id: "asc" },
  });

  if (!admin) {
    throw new Error("No ADMIN user found for smoke test");
  }

  const machine = await prisma.machine.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true, type: true, status: true },
    orderBy: { id: "asc" },
  });

  if (!machine) {
    throw new Error("No machine record found for smoke test");
  }

  const shift = await prisma.shift.findFirst({
    select: { id: true, name: true, startTime: true, endTime: true },
    orderBy: { id: "asc" },
  });

  if (!shift) {
    throw new Error("No shift record found for smoke test");
  }

  const token = jwt.sign({ id: String(admin.id) }, secret);

  const machineRes = await fetch(`${baseUrl}/machines/${machine.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: machine.name,
      type: machine.type,
      status: machine.status,
    }),
  });

  const machineBody = await machineRes.text();

  const shiftRes = await fetch(`${baseUrl}/shifts/${shift.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: shift.name,
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
    }),
  });

  const shiftBody = await shiftRes.text();

  console.log(`MACHINE_STATUS=${machineRes.status}`);
  console.log(`MACHINE_BODY=${machineBody}`);
  console.log(`SHIFT_STATUS=${shiftRes.status}`);
  console.log(`SHIFT_BODY=${shiftBody}`);
};

run()
  .catch((error) => {
    console.error("SMOKE_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
