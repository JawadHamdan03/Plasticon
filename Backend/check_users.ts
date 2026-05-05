import { prisma } from "./src/config/lib/prisma";

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, isActive: true }
  });
  console.log("Users in database:", JSON.stringify(users, null, 2));
}

checkUsers()
  .catch(console.error)
  .finally(() => process.exit(0));
