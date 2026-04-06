import "dotenv/config.js";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("================================");
    console.log("📊 CHECKING DATABASE STATUS");
    console.log("================================\n");

    // Check all admin users
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("✅ ADMIN USERS:\n");
    admins.forEach((admin, idx) => {
      console.log(`${idx + 1}. Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}\n`);
    });

    console.log(`Total Admin Users: ${admins.length}\n`);

    // Check if new admin exists
    const newAdmin = await prisma.user.findUnique({
      where: { email: "esawiaburakan@gmail.com" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        password: true,
      },
    });

    if (newAdmin) {
      console.log("✅ NEW ADMIN FOUND:");
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Username: ${newAdmin.username}`);
      console.log(`   Role: ${newAdmin.role}`);
      console.log(`   Active: ${newAdmin.isActive}`);
      console.log(
        `   Password Hash Length: ${newAdmin.password.length} chars\n`,
      );
    } else {
      console.log("❌ NEW ADMIN NOT FOUND\n");
    }

    console.log("================================");
    console.log("✅ DATABASE CHECK COMPLETE");
    console.log("================================");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
