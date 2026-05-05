import "dotenv/config.js";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_SALT_ROUNDS = 12;

async function addAdmin() {
  try {
    const email = "esawiaburakan@gmail.com";
    const password = "0598032500";
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`⚠️  Admin with email ${email} already exists. Updating...`);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isActive: true,
          role: "ADMIN",
        },
      });
      console.log(`✅ Updated existing admin: ${email}`);
    } else {
      console.log(`📝 Creating new admin: ${email}`);
      await prisma.user.create({
        data: {
          nationalId: "999900099",
          fullName: "Admin User",
          username: "admin_esawiaburakan",
          phone: "0598032500",
          email,
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log(`✅ Successfully created admin: ${email}`);
    }

    console.log("\n📧 Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error("❌ Error adding admin:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmin();
