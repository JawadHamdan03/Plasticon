import { prisma } from "../src/config/lib/prisma.js";

const users = await prisma.user.findMany({
  select: { id: true, email: true, role: true, isActive: true },
  orderBy: { id: "asc" },
});

for (const u of users) {
  console.log(`${u.id}\t${u.role}\t${u.isActive ? "active" : "INACTIVE"}\t${u.email}`);
}

await prisma.$disconnect();
