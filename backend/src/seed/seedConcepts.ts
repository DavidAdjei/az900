import fs from "fs";
import path from "path";
import { PrismaClient, Domain } from "@prisma/client";

const prisma = new PrismaClient();

const KB_DIR = path.join(__dirname, "..", "data", "kb");

// Maps the kebab-case domainId used in the knowledge base JSON to the
// existing Prisma `Domain` enum values already used by Question/Flashcard.
const DOMAIN_ID_MAP: Record<string, Domain> = {
  "cloud-concepts": "CLOUD_CONCEPTS",
  "azure-architecture-services": "ARCHITECTURE_SERVICES",
  "management-governance": "MANAGEMENT_GOVERNANCE",
};

type KBConcept = {
  id: string;
  term: string;
  definition: string;
  details?: string;
  plainEnglish?: string;
  examTips?: string[];
  gotchas?: string[];
  examples?: string[];
  quickCheck?: { question: string; answer: string };
};

type KBTopic = {
  id: string;
  name: string;
  concepts: KBConcept[];
};

type KBDomainFile = {
  domainId: string;
  name: string;
  examWeight: string;
  topics: KBTopic[];
};

async function main() {
  const files = fs
    .readdirSync(KB_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  let topicCount = 0;
  let conceptCount = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(KB_DIR, file), "utf-8");
    const data: KBDomainFile = JSON.parse(raw);

    const domain = DOMAIN_ID_MAP[data.domainId];
    if (!domain) {
      console.warn(`Skipping ${file}: unrecognized domainId "${data.domainId}"`);
      continue;
    }

    for (let ti = 0; ti < data.topics.length; ti++) {
      const topic = data.topics[ti];

      await prisma.topic.upsert({
        where: { id: topic.id },
        create: { id: topic.id, domain, name: topic.name, sortOrder: ti },
        update: { domain, name: topic.name, sortOrder: ti },
      });
      topicCount++;

      for (let ci = 0; ci < topic.concepts.length; ci++) {
        const c = topic.concepts[ci];

        await prisma.concept.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            topicId: topic.id,
            domain,
            term: c.term,
            definition: c.definition,
            details: c.details ?? null,
            plainEnglish: c.plainEnglish ?? null,
            examTips: c.examTips ?? undefined,
            gotchas: c.gotchas ?? undefined,
            examples: c.examples ?? undefined,
            quickCheckQuestion: c.quickCheck?.question ?? null,
            quickCheckAnswer: c.quickCheck?.answer ?? null,
            sortOrder: ci,
          },
          update: {
            topicId: topic.id,
            domain,
            term: c.term,
            definition: c.definition,
            details: c.details ?? null,
            plainEnglish: c.plainEnglish ?? null,
            examTips: c.examTips ?? undefined,
            gotchas: c.gotchas ?? undefined,
            examples: c.examples ?? undefined,
            quickCheckQuestion: c.quickCheck?.question ?? null,
            quickCheckAnswer: c.quickCheck?.answer ?? null,
            sortOrder: ci,
          },
        });
        conceptCount++;
      }
    }
  }

  console.log(`Seeded ${topicCount} topics and ${conceptCount} concepts from ${files.length} domain file(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
