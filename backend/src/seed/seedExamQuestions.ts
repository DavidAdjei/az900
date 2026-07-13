import fs from "fs";
import path from "path";
import { PrismaClient, Domain } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "..", "data", "exam");

const FILE_DOMAIN_MAP: Record<string, Domain> = {
  "domain-1-exam.json": "CLOUD_CONCEPTS",
  "domain-2-exam.json": "ARCHITECTURE_SERVICES",
  "domain-3-exam.json": "MANAGEMENT_GOVERNANCE",
};

type QChoice = { id: string; text: string };
type ExamQuestionInput = {
  id: string;
  prompt: string;
  choices: QChoice[];
  correctChoiceIds: string[];
  multiSelect?: boolean;
  diagramSvg?: string;
  explanation: string;
};

function shuffleChoices<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  // Wipe existing exam questions. Any in-progress ExamSession rows reference question ids
  // that would no longer exist, so we also clear sessions — re-running this is a "reset the
  // mock exam bank" operation, not something to do casually on a live database.
  await prisma.examSession.deleteMany({});
  await prisma.examQuestion.deleteMany({});

  let count = 0;

  for (const [file, domain] of Object.entries(FILE_DOMAIN_MAP)) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${file}`);
      continue;
    }
    const questions: ExamQuestionInput[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const q of questions) {
      const multiSelect = q.multiSelect ?? q.correctChoiceIds.length > 1;
      await prisma.examQuestion.create({
        data: {
          domain,
          prompt: q.prompt,
          choices: shuffleChoices(q.choices),
          correctChoiceIds: q.correctChoiceIds,
          multiSelect,
          diagramSvg: q.diagramSvg ?? null,
          explanation: q.explanation,
        },
      });
      count++;
    }
  }

  console.log(`Seeded ${count} mock exam questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
