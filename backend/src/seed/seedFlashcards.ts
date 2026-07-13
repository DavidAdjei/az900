import fs from "fs";
import path from "path";
import { PrismaClient, Domain } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "..", "data", "flashcards");

const FILE_DOMAIN_MAP: Record<string, Domain> = {
  "domain-1-flashcards.json": "CLOUD_CONCEPTS",
  "domain-2-flashcards.json": "ARCHITECTURE_SERVICES",
  "domain-3-flashcards.json": "MANAGEMENT_GOVERNANCE",
};

type FlashcardInput = { front: string; back: string };

async function main() {
  // Wipe existing reviews + cards so this fully replaces the deck (safe: reviews are
  // per-user progress on cards that are about to be regenerated with new ids anyway).
  await prisma.flashcardReview.deleteMany({});
  await prisma.flashcard.deleteMany({});

  let count = 0;

  for (const [file, domain] of Object.entries(FILE_DOMAIN_MAP)) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${file}`);
      continue;
    }
    const cards: FlashcardInput[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const c of cards) {
      await prisma.flashcard.create({ data: { domain, front: c.front, back: c.back } });
      count++;
    }
  }

  console.log(`Seeded ${count} flashcards.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
