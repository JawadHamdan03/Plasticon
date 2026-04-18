import { prisma } from "./src/config/lib/prisma/index.js";

const users = await prisma.user.findMany({
  select: { id: true, username: true, email: true, role: true, isActive: true }
});

console.log("Users in database:", users);
await prisma.$disconnect();
