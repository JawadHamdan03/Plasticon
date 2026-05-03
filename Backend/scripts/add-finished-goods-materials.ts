import "dotenv/config";
import { prisma } from "../src/config/lib/prisma";

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
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
