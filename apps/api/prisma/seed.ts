import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/seed-data";

const prisma = new PrismaClient();

runSeed(prisma)
  .then(() => console.info("ScholarShelf database seeded."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
