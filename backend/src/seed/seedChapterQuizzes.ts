import fs from "fs";
import path from "path";
import { PrismaClient, Domain } from "@prisma/client";

const prisma = new PrismaClient();
const KB_DIR = path.join(__dirname, "..", "data", "kb");

const DOMAIN_ID_MAP: Record<string, Domain> = {
  "cloud-concepts": "CLOUD_CONCEPTS",
  "azure-architecture-services": "ARCHITECTURE_SERVICES",
  "management-governance": "MANAGEMENT_GOVERNANCE",
};

type KBConcept = { id: string; term: string; definition: string; plainEnglish?: string };
type KBTopic = { id: string; name: string; concepts: KBConcept[] };
type KBDomainFile = { domainId: string; topics: KBTopic[] };

type FlatConcept = KBConcept & { domain: Domain; topicId: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hand-authored fallback for chapters too small to auto-generate 2+ distinct
// "match the definition" questions (currently just the single-concept Responsible AI chapter).
const MANUAL_QUESTIONS: Record<string, Array<{ prompt: string; choices: string[]; correctIndex: number; explanation: string }>> = {
  "responsible-ai": [
    {
      prompt: "A team makes sure their AI model doesn't discriminate against any demographic group. Which Responsible AI principle is this?",
      choices: ["Fairness", "Transparency", "Accountability", "Reliability & Safety"],
      correctIndex: 0,
      explanation: "Fairness means AI systems should treat all people fairly and avoid unfair bias against any group.",
    },
    {
      prompt: "A chatbot always discloses to users that they're talking to an AI, not a human. Which principle does this reflect?",
      choices: ["Inclusiveness", "Transparency", "Privacy & Security", "Reliability & Safety"],
      correctIndex: 1,
      explanation: "Transparency means being open about how AI systems work and when people are interacting with AI rather than a human.",
    },
    {
      prompt: "Which Responsible AI principle means a human is always ultimately responsible for how an AI system behaves?",
      choices: ["Accountability", "Inclusiveness", "Fairness", "Privacy & Security"],
      correctIndex: 0,
      explanation: "Accountability means the people who design and deploy AI systems remain responsible for their outcomes — the AI itself is never 'the one to blame.'",
    },
  ],
};

async function main() {
  // Wipe existing generated questions so this script can be safely re-run after KB edits.
  await prisma.chapterQuizAttempt.deleteMany({});
  await prisma.chapterQuizQuestion.deleteMany({});

  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".json")).sort();
  const allConcepts: FlatConcept[] = [];
  const domainFiles: KBDomainFile[] = [];

  for (const file of files) {
    const data: KBDomainFile = JSON.parse(fs.readFileSync(path.join(KB_DIR, file), "utf-8"));
    domainFiles.push(data);
    const domain = DOMAIN_ID_MAP[data.domainId];
    for (const topic of data.topics) {
      for (const c of topic.concepts) {
        allConcepts.push({ ...c, domain, topicId: topic.id });
      }
    }
  }

  let questionCount = 0;

  for (const data of domainFiles) {
    const domain = DOMAIN_ID_MAP[data.domainId];
    if (!domain) continue;

    for (const topic of data.topics) {
      const rows: Array<{ prompt: string; choices: { id: string; text: string }[]; correctChoiceId: string; explanation: string; sortOrder: number }> = [];

      if (MANUAL_QUESTIONS[topic.id]) {
        MANUAL_QUESTIONS[topic.id].forEach((q, i) => {
          const choiceObjs = q.choices.map((text, ci) => ({ id: `c${ci}`, text }));
          rows.push({
            prompt: q.prompt,
            choices: choiceObjs,
            correctChoiceId: choiceObjs[q.correctIndex].id,
            explanation: q.explanation,
            sortOrder: i,
          });
        });
      } else {
        // Auto-generate up to 5 "match the definition to the term" questions per chapter.
        const questionConcepts = shuffle(topic.concepts).slice(0, Math.min(5, topic.concepts.length));

        // Distractor pool: prefer other concepts in the same domain, excluding this chapter's own concepts.
        const sameDomainOthers = allConcepts.filter((c) => c.domain === domain && c.topicId !== topic.id);
        const globalOthers = allConcepts.filter((c) => c.topicId !== topic.id);

        questionConcepts.forEach((concept, i) => {
          const pool = sameDomainOthers.length >= 3 ? sameDomainOthers : globalOthers;
          const distractorPool = shuffle(pool.filter((c) => c.term !== concept.term)).slice(0, 3);
          const options = shuffle([concept.term, ...distractorPool.map((d) => d.term)]);
          const choiceObjs = options.map((text, ci) => ({ id: `c${ci}`, text }));
          const correctChoiceId = choiceObjs.find((c) => c.text === concept.term)!.id;

          rows.push({
            prompt: `Which Azure concept best matches this description?\n\n"${concept.definition}"`,
            choices: choiceObjs,
            correctChoiceId,
            explanation: concept.plainEnglish
              ? `${concept.term} — ${concept.plainEnglish}`
              : `${concept.term} — ${concept.definition}`,
            sortOrder: i,
          });
        });
      }

      for (const row of rows) {
        await prisma.chapterQuizQuestion.create({
          data: {
            topicId: topic.id,
            prompt: row.prompt,
            choices: row.choices,
            correctChoiceId: row.correctChoiceId,
            explanation: row.explanation,
            sortOrder: row.sortOrder,
          },
        });
        questionCount++;
      }
    }
  }

  console.log(`Seeded ${questionCount} chapter quiz questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
