// One-time script: adds "Preform (PET)" and "Caps" to the RawMaterial table.
// Run from Backend/: node scripts/add-finished-goods-materials.mjs

import "dotenv/config.js";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const materials = [
  { name: "Preform (PET)", currentQuantity: 0, unit: "CARTON" },
  { name: "Caps", currentQuantity: 0, unit: "CARTON" },
];

async function main() {
  for (const mat of materials) {
    const existing = await prisma.rawMaterial.findFirst({ where: { name: mat.name } });
    if (existing) {
      console.log(`Already exists: ${mat.name} (id=${existing.id})`);
      continue;
    }
    const created = await prisma.rawMaterial.create({ data: mat });
    console.log(`Created: ${created.name} (id=${created.id})`);
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
