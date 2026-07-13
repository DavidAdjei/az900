# AZ-900 Study Map

A study site for the Microsoft AZ-900 (Azure Fundamentals) exam: a guided, chapter-by-chapter
learning path with locked progression and per-chapter checks, a quiz engine, a timed 100+ question
mock exam, spaced-repetition flashcards, per-domain progress tracking, and light/dark theming.

```
az900-app/
  backend/    Node/Express API (TypeScript, Prisma, MySQL)
  frontend/   React app (Vite, TypeScript, Tailwind)
```

## 1. Backend setup

```bash
cd backend
cp .env.example .env       # then edit DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed                # a small legacy sample of questions (base data)
npm run seed:concepts       # loads the AZ-900 knowledge base (Topics + Concepts)
npm run seed:chapters       # generates the per-chapter gating quizzes (needs seed:concepts first)
npm run seed:questions      # replaces the practice question bank (53 original questions, see below)
npm run seed:exam           # loads the 105-question mock exam pool (needs the Learning Path seeded)
npm run seed:flashcards     # loads the flashcard deck (98 cards, ~30+ per domain)
npm run dev                 # http://localhost:4000
```

`DATABASE_URL` needs a MySQL instance, e.g. `mysql://user:password@localhost:3306/az900`.
For Azure, use **Azure Database for MySQL – Flexible Server** and paste its connection string in.

`JWT_SECRET` should be a long random string — generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Frontend setup

```bash
cd frontend
cp .env.example .env       # VITE_API_URL should point at the backend
npm install
npm run dev                 # http://localhost:5173
```

## 3. What's included

- **Auth** — email/password with JWT (30-day tokens). Swap in Microsoft Entra ID/OAuth later if
  you want single sign-on for a public audience.
- **Learning Path (guided course)** — the main way to study. Each domain is broken into chapters
  (one per `Topic`). Chapters unlock in order: the first chapter of Domain 1 is always open;
  every other chapter unlocks only after the previous one is passed; a whole domain unlocks only
  after every chapter in the domain before it is complete. Locking is enforced server-side
  (`backend/src/lib/learningProgress.ts` + `backend/src/routes/learning.ts`), not just hidden in
  the UI, so it can't be bypassed by hitting the API directly.
  - Each chapter has its own page (`/learn/:topicId`) with the full concept content (definitions,
    plain-English explanations, exam tips, gotchas, quick-checks), a **reading progress bar** that
    fills in as you open each concept, and an estimated read time.
  - At the end of every chapter is a **chapter check** — a short auto-generated quiz
    (`ChapterQuizQuestion`, built by `npm run seed:chapters` from the concept definitions in the
    knowledge base) with immediate feedback and an explanation after each answer. Scoring 70%+
    (`PASS_THRESHOLD` in `learningProgress.ts`) unlocks the next chapter; you can retry as many
    times as needed — a chapter counts as passed the first time you get 70% of its questions right,
    even across multiple attempts.
  - `/learn` is the roadmap: every domain and chapter with a lock/checkmark/progress state, plus
    an overall "exam readiness" bar combining every domain.
  - The homepage shows a compact version of the same per-domain progress bars for signed-in users.
  - Data model: `Topic` = chapter, `ChapterProgress` = per-user completion + best score,
    `ConceptView` = per-user reading progress, `ChapterQuizQuestion`/`ChapterQuizAttempt` = the
    gating quiz and its attempts.
  - `GET /api/learning/domains`, `GET /api/learning/chapters/:topicId`,
    `POST /api/learning/chapters/:topicId/view`, `GET /api/learning/chapters/:topicId/quiz`,
    `POST /api/learning/chapters/:topicId/quiz/:questionId/attempt`,
    `POST /api/learning/chapters/:topicId/complete`.
  - To change the pass threshold, edit `PASS_THRESHOLD` in `backend/src/lib/learningProgress.ts`.
  - To hand-write better chapter-check questions instead of the auto-generated "match the
    definition" ones, edit `MANUAL_QUESTIONS` in `backend/src/seed/seedChapterQuizzes.ts` (see the
    Responsible AI chapter for an example) and re-run `npm run seed:chapters` — it wipes and
    regenerates all chapter quiz questions, so any earlier user *attempts* on those questions are
    cleared, but `ChapterProgress` (pass/fail history) is untouched.
  - The standalone "Notes" and "Deep Dive" pages that used to duplicate this content outside the
    Learning Path have been removed — the same concept data (definitions, plain-English
    explanations, exam tips, gotchas, quick-checks) now lives only inside each chapter page, which
    is also where the reading-progress tracking and gating quiz are. To edit concept content, edit
    the JSON files in `backend/src/data/kb/` and re-run `npm run seed:concepts` (it upserts, so
    it's safe to re-run any time).
- **Quiz** — 53 original practice questions across all three domains (`backend/src/data/questions/`),
  written from scratch to mirror the style and difficulty of the real exam — not copied from any
  question dump. Includes:
  - **Single-select** questions (most of them) and **multi-select "choose two" questions**
    (`multiSelect: true`, graded as correct only when the exact set of correct choices is picked).
  - **Diagram-based questions** — 6 of them, each with an original inline SVG diagram (network
    topology, resource hierarchy, shared-responsibility table, load-balancer scenario, composite
    SLA) rendered above the prompt in `Quiz.tsx`. To add another, put an SVG string in a question's
    `diagramSvg` field in the JSON — see `backend/src/data/questions/domain-*-questions.json` and
    `generate_diagrams.py`-style hand-authored SVGs for the pattern.
  - Every question has a plain-language explanation shown after you answer, regardless of whether
    you got it right.
  - Loaded by `npm run seed:questions`, which **replaces** the whole practice bank (safe to
    re-run after editing the JSON files). To add your own questions, edit
    `backend/src/data/questions/domain-{1,2,3}-questions.json` and re-run the seed — no schema
    changes needed.
  - Schema additions: `Question.correctChoiceIds` (array, multi-select only),
    `Question.multiSelect`, `Question.diagramSvg`, `Attempt.chosenChoiceIds`. If you already ran
    migrations before this update, run `npx prisma migrate dev --name multiselect_and_diagrams`
    first.
- **Practice Exam** — a full timed mock exam, gated behind finishing the entire Learning Path.
  - **Gating/locking**: `/api/exam/eligibility` (and every session route) checks that all three
    domains are 100% complete via the same `getLearningState()` used by the Learning Path — the
    exam can't be started or resumed early, even by calling the API directly.
  - **Question pool**: 105 original questions in `backend/src/data/exam/domain-{1,2,3}-exam.json`
    (30/45/30, proportional to the real exam's domain weighting), loaded by `npm run seed:exam`
    into a dedicated `ExamQuestion` table — separate from the regular Quiz bank, so the two don't
    overlap. Every seed script that generates multiple-choice questions (`seedPracticeQuestions.ts`,
    `seedExamQuestions.ts`) now shuffles each question's choice order before saving, so the
    correct answer isn't predictably in the same position — only the display order changes;
    grading still compares by choice id, so nothing else is affected. Re-run the relevant seed
    script if you add more questions and want them shuffled too.
  - **Timer**: each attempt (`ExamSession`) samples 60 questions from the pool and gets a 2-hour
    `expiresAt`. The frontend runs a live countdown and auto-submits at zero; the backend
    independently re-checks `expiresAt` on every request (`loadAndMaybeFinalize` in
    `backend/src/routes/exam.ts`), so a session can't be kept alive past 2 hours even if the
    client never calls submit (e.g. the laptop was closed).
  - **Progress saving / resume**: every answer is saved to the database immediately
    (`POST /api/exam/session/:id/answer`), not just held in memory. Only one `IN_PROGRESS`
    session per user is allowed — `POST /api/exam/start` returns the existing session instead of
    creating a new one if you already have one running, and the exam landing page
    (`ExamLanding.tsx`) surfaces a "Resume exam" button whenever that's the case. Reloading or
    closing `/exam/:sessionId` and coming back re-fetches the exact same question set, saved
    answers, and correctly recomputed remaining time.
  - **Progress tracker while taking it**: a progress bar and "X/Y answered" counter in the sticky
    header, plus a question-navigator grid (`ExamSession.tsx`) showing which questions are
    answered vs. still open, so you can jump around instead of only going linearly.
  - **Review + history**: after submitting (or timing out), `/exam/:sessionId/review` shows every
    question with your answer, the correct answer, and its explanation, filterable to "missed
    only." Past attempts are listed on `/exam` via `GET /api/exam/history`.
  - Schema additions: `ExamQuestion`, `ExamSession`, `ExamStatus` enum, plus a reverse relation on
    `User`. If you already ran migrations before this update, run
    `npx prisma migrate dev --name practice_exam` first.
  - To change the pass/fail color threshold shown in the UI, or the exam length/duration, edit
    `QUESTIONS_PER_EXAM` and `EXAM_DURATION_MS` in `backend/src/routes/exam.ts`.
- **Flashcards** — 98 original cards (~30+ per domain, `backend/src/data/flashcards/`), loaded by
  `npm run seed:flashcards` (see `seedFlashcards.ts`; safe to re-run, it replaces the deck and its
  per-user review history). Reviews use a simple Leitner-box spaced-repetition schedule
  (`backend/src/routes/flashcards.ts`) — grading a card "Got it" pushes its next review further
  out; "Still learning" resets it to box 0. The card itself is a real 3D flip (CSS
  `transform-style: preserve-3d`, see `.flip-scene`/`.flip-card` in `index.css`), shows a box-level
  indicator (New → Mastered) and progress bar through the current deck, and can toggle between
  "due for review" and "all cards" in a domain. To add more cards, edit the JSON files and re-run
  the seed.
- **Theme** — light/dark toggle in the header (`ThemeContext.tsx`), persisted to `localStorage`
  and defaulting to the OS preference on first visit. Implemented via a `data-theme` attribute on
  `<html>` plus CSS custom properties in `index.css`; Tailwind's color tokens
  (`canvas`/`surface`/`raised`/`line`/`ink`/`muted`/`signal`/`wire`/`node`) all resolve to those
  variables, so no component needs to know which theme is active. `invert` is the one fixed,
  non-themed color (always near-black), used for text on accent-colored buttons/badges since
  those accent colors stay mid-brightness in both themes.
- **Route protection** — enforced in two independent layers:
  - **Backend**: every route that touches user-specific data requires a valid JWT via the
    `requireAuth` middleware (`backend/src/middleware/auth.ts`) — this is checked regardless of
    what the frontend does, so the API can't be bypassed by calling it directly. The only public
    GET is the sanitized question list, which never includes answers.
  - **Frontend**: `components/ProtectedRoute.tsx` wraps every route that needs a signed-in user
    (Learning Path, Quiz, Practice Exam, Flashcards, Progress) and redirects signed-out visitors to
    `/login?from=<page>`; `Login.tsx` reads that `from` param and returns them to the page they
    wanted after signing in. This is a UX convenience layer only — the backend check is what
    actually secures the data.
- **Progress** — per-domain quiz accuracy and flashcards-learned, rendered with a small
  node/network visualization tying back to Azure's own region/availability-zone concepts.

## 4. Deploying (matching your existing Azure setup)

- **Frontend** → Azure Static Web Apps (same as your Diary Management System).
- **Backend** → Azure App Service or Container Apps running the Express API.
- **Database** → Azure Database for MySQL – Flexible Server.
- Set `CORS_ORIGIN` on the backend to your deployed frontend URL, and `VITE_API_URL` on the
  frontend to your deployed backend URL.

## 5. Next steps worth considering

- Add more quiz questions/flashcards — the seed file is the single place to extend content.
- Add Microsoft Entra ID login instead of (or alongside) email/password.
- Add a "weak domain" recommendation on the Progress page once there's enough attempt data.
