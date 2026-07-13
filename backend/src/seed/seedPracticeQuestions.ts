import fs from "fs";
import path from "path";
import { PrismaClient, Domain } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "..", "data", "questions");

const FILE_DOMAIN_MAP: Record<string, Domain> = {
  "domain-1-questions.json": "CLOUD_CONCEPTS",
  "domain-2-questions.json": "ARCHITECTURE_SERVICES",
  "domain-3-questions.json": "MANAGEMENT_GOVERNANCE",
};

type QChoice = { id: string; text: string };
type QuestionInput = {
  id: string;
  prompt: string;
  choices: QChoice[];
  correctChoiceIds: string[];
  multiSelect?: boolean;
  diagramSvg?: string;
  explanation: string;
};

// Shuffles the on-screen order of a question's choices. Choice objects keep their own
// {id, text} pairing, so this only changes display position — correctness checking
// (which compares by id) is completely unaffected.
function shuffleChoices<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  // Wipe existing attempts + questions so re-running this script fully replaces the bank
  // (safe: chapter quizzes and everything else in the app are separate tables).
  await prisma.attempt.deleteMany({});
  await prisma.question.deleteMany({});

  let count = 0;

  for (const [file, domain] of Object.entries(FILE_DOMAIN_MAP)) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${file}`);
      continue;
    }
    const questions: QuestionInput[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const q of questions) {
      const multiSelect = q.multiSelect ?? q.correctChoiceIds.length > 1;
      const shuffled = shuffleChoices(q.choices);
      await prisma.question.create({
        data: {
          domain,
          prompt: q.prompt,
          choices: shuffled,
          correctChoiceId: q.correctChoiceIds[0],
          correctChoiceIds: multiSelect ? q.correctChoiceIds : undefined,
          multiSelect,
          diagramSvg: q.diagramSvg ?? null,
          explanation: q.explanation,
        },
      });
      count++;
    }
  }

  console.log(`Seeded ${count} practice questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
