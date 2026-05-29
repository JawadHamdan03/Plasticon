import bcrypt from "bcrypt";
import { prisma } from "../src/config/lib/prisma.js";

const NEW_PASSWORD = "Pass1234!";
const hash = await bcrypt.hash(NEW_PASSWORD, 10);

const testEmails = [
  "admin@plasticon.local",
  "worker@plasticon.local",
  "engineer@plasticon.local",
  "accountant@plasticon.local",
];

for (const email of testEmails) {
  await prisma.user.update({ where: { email }, data: { password: hash, isActive: true } });
  console.log(`✓ reset: ${email}`);
}

console.log(`\nAll passwords set to: ${NEW_PASSWORD}`);
await prisma.$disconnect();
