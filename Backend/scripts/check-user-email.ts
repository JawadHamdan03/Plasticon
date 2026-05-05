import { prisma } from "../src/config/lib/prisma";

async function main() {
  const email = "mhmdesawi2@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    console.log("NOT_FOUND");
  } else {
    console.log("FOUND", JSON.stringify(user));
  }
}

main()
  .catch((error) => {
    console.error("CHECK_FAILED", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
