import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api, ChapterDetail, ChapterQuizQuestion, Concept } from "../api/client";

const BAR_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };
const TEXT_MAP: Record<string, string> = { wire: "text-wire", signal: "text-signal", node: "text-node" };
const BTN_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-raised overflow-hidden">
      <div className={`h-full rounded-full ${BAR_MAP[color]} transition-all`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function estimateReadMinutes(concepts: Concept[]) {
  const words = concepts.reduce((sum, c) => {
    const text = [c.definition, c.plainEnglish, c.details, ...(c.examTips || []), ...(c.gotchas || [])]
      .filter(Boolean)
      .join(" ");
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 180)); // ~180 wpm reading technical text
}

function ConceptReadCard({
  concept,
  accent,
  viewed,
  onView,
}: {
  concept: Concept;
  accent: string;
  viewed: boolean;
  onView: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !viewed) onView(concept.id);
  }

  return (
    <div className={`border rounded-lg bg-surface overflow-hidden ${viewed ? "border-line" : "border-line"}`}>
      <button onClick={toggle} className="w-full text-left px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${
              viewed ? `${BAR_MAP[accent]} border-transparent` : "border-line"
            }`}
          >
            {viewed && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
          <div>
            <h3 className="font-display font-semibold mb-1">{concept.term}</h3>
            <p className="text-sm text-muted leading-relaxed mb-2">{concept.definition}</p>
            {concept.plainEnglish && (
              <p className="text-sm text-ink leading-relaxed italic border-l-2 border-line pl-3">
                {concept.plainEnglish}
              </p>
            )}
          </div>
        </div>
        <span className={`font-mono text-xs shrink-0 mt-1 ${TEXT_MAP[accent]}`}>{open ? "− less" : "+ more"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-line pt-4 pl-12">
          {concept.details && <p className="text-sm text-muted leading-relaxed">{concept.details}</p>}
          {!!concept.examTips?.length && (
            <div>
              <p className={`font-mono text-xs mb-2 ${TEXT_MAP[accent]}`}>EXAM TIPS</p>
              <ul className="space-y-1.5">
                {concept.examTips.map((t, i) => (
                  <li key={i} className="text-sm text-ink leading-relaxed pl-4 border-l border-line">{t}</li>
                ))}
              </ul>
            </div>
          )}
          {!!concept.gotchas?.length && (
            <div>
              <p className="font-mono text-xs mb-2 text-signal">GOTCHAS</p>
              <ul className="space-y-1.5">
                {concept.gotchas.map((g, i) => (
                  <li key={i} className="text-sm text-ink leading-relaxed pl-4 border-l border-signal/40">{g}</li>
                ))}
              </ul>
            </div>
          )}
          {concept.quickCheckQuestion && concept.quickCheckAnswer && (
            <div className="rounded-md border border-line bg-raised p-4">
              <p className="font-mono text-xs mb-2 text-muted">QUICK CHECK</p>
              <p className="text-sm text-ink mb-1 leading-relaxed">{concept.quickCheckQuestion}</p>
              <p className={`text-sm leading-relaxed mt-2 ${TEXT_MAP[accent]}`}>{concept.quickCheckAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Mode = "read" | "quiz" | "result";

export function ChapterPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("read");

  const [quizQuestions, setQuizQuestions] = useState<ChapterQuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctChoiceId: string; explanation: string } | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.completeChapter>> | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    if (!user || !topicId) return;
    setChapter(null);
    setError(null);
    setMode("read");
    api
      .getChapter(topicId)
      .then((d) => {
        setChapter(d);
        setViewedIds(new Set(d.progress.viewedConceptIds));
      })
      .catch((e) => setError(e.message));
  }, [user, topicId]);

  const accent = chapter ? DOMAINS[chapter.topic.domain as keyof typeof DOMAINS].color : "signal";
  const readMinutes = useMemo(() => (chapter ? estimateReadMinutes(chapter.topic.concepts) : 0), [chapter]);

  async function handleView(conceptId: string) {
    if (!topicId) return;
    setViewedIds((prev) => new Set(prev).add(conceptId));
    try {
      await api.markConceptViewed(topicId, conceptId);
    } catch {
      // non-critical — reading progress will resync on next load
    }
  }

  async function startQuiz() {
    if (!topicId) return;
    setQuizLoading(true);
    setMode("quiz");
    setQIndex(0);
    setQuizScore(0);
    setSelected(null);
    setFeedback(null);
    setResult(null);
    try {
      const { questions } = await api.getChapterQuiz(topicId);
      setQuizQuestions(questions.sort(() => Math.random() - 0.5));
    } catch (e: any) {
      setError(e.message);
      setMode("read");
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleSelect(choiceId: string) {
    if (selected || !topicId) return;
    setSelected(choiceId);
    const current = quizQuestions[qIndex];
    const res = await api.submitChapterQuizAttempt(topicId, current.id, choiceId);
    setFeedback(res);
    if (res.correct) setQuizScore((s) => s + 1);
  }

  async function handleNextQuestion() {
    if (qIndex + 1 >= quizQuestions.length) {
      if (!topicId) return;
      const res = await api.completeChapter(topicId);
      setResult(res);
      setMode("result");
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
    setFeedback(null);
  }

  if (!user) {
    return (
      <div>
        <p className="text-muted">
          <Link to="/login" className="text-signal">
            Sign in
          </Link>{" "}
          to access the learning path.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-signal mb-4">{error}</p>
        <Link to="/learn" className="font-mono text-xs text-muted hover:text-ink">
          ← Back to Learning Path
        </Link>
      </div>
    );
  }

  if (!chapter) {
    return <p className="text-sm text-muted">Loading chapter…</p>;
  }

  const domainMeta = DOMAINS[chapter.topic.domain as keyof typeof DOMAINS];

  return (
    <div className="max-w-2xl">
      <Link to="/learn" className="font-mono text-xs text-muted hover:text-ink inline-block mb-4">
        ← Back to Learning Path
      </Link>

      <p className={`font-mono text-xs mb-2 ${TEXT_MAP[accent]}`}>{domainMeta.label.toUpperCase()}</p>
      <h1 className="font-display text-2xl font-semibold mb-3">{chapter.topic.name}</h1>

      {mode === "read" && (
        <>
          <div className="flex items-center gap-4 text-xs text-muted font-mono mb-2">
            <span>{chapter.topic.concepts.length} concepts</span>
            <span>~{readMinutes} min read</span>
            {chapter.progress.completed && (
              <span className={TEXT_MAP[accent]}>✓ Completed · scored {chapter.progress.bestScore}%</span>
            )}
          </div>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-muted">READING PROGRESS</span>
              <span className="font-mono text-xs text-ink">
                {viewedIds.size}/{chapter.topic.concepts.length}
              </span>
            </div>
            <ProgressBar
              percent={chapter.topic.concepts.length ? Math.round((viewedIds.size / chapter.topic.concepts.length) * 100) : 0}
              color={accent}
            />
          </div>

          <div className="space-y-3 mb-8">
            {chapter.topic.concepts.map((c) => (
              <ConceptReadCard key={c.id} concept={c} accent={accent} viewed={viewedIds.has(c.id)} onView={handleView} />
            ))}
          </div>

          <div className="border border-line rounded-lg bg-surface p-6 text-center">
            <p className="font-display font-semibold mb-1">
              {chapter.progress.completed ? "Ready to review the chapter check?" : "Ready to test what you've learned?"}
            </p>
            <p className="text-sm text-muted mb-4">
              {chapter.topic.quizQuestionCount} questions · need 70% to unlock the next chapter.
            </p>
            <button
              onClick={startQuiz}
              className={`${BTN_MAP[accent]} text-invert font-medium rounded-md px-5 py-2.5`}
            >
              {chapter.progress.completed ? "Retake chapter check" : "Start chapter check"}
            </button>
          </div>
        </>
      )}

      {mode === "quiz" && (
        <div>
          {quizLoading && <p className="text-sm text-muted">Loading check…</p>}
          {!quizLoading && quizQuestions[qIndex] && (
            <div>
              <p className="font-mono text-xs text-muted mb-3">
                Question {qIndex + 1} of {quizQuestions.length} · Score {quizScore}
              </p>
              <p className="text-lg mb-5 leading-relaxed whitespace-pre-line">{quizQuestions[qIndex].prompt}</p>

              <div className="space-y-2 mb-6">
                {quizQuestions[qIndex].choices.map((choice) => {
                  const isSelected = selected === choice.id;
                  const isCorrectChoice = feedback && choice.id === feedback.correctChoiceId;
                  let style = "border-line hover:border-muted";
                  if (feedback) {
                    if (isCorrectChoice) style = "border-wire bg-wire/10";
                    else if (isSelected && !feedback.correct) style = "border-red-400 bg-red-400/10";
                  } else if (isSelected) {
                    style = "border-signal";
                  }
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelect(choice.id)}
                      disabled={!!selected}
                      className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${style}`}
                    >
                      {choice.text}
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div className="mb-6">
                  <p className={`text-sm mb-4 leading-relaxed ${feedback.correct ? TEXT_MAP[accent] : "text-muted"}`}>
                    {feedback.explanation}
                  </p>
                  <button
                    onClick={handleNextQuestion}
                    className={`${BTN_MAP[accent]} text-invert font-medium rounded-md px-4 py-2`}
                  >
                    {qIndex + 1 >= quizQuestions.length ? "See results" : "Next question"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "result" && result && (
        <div className="border border-line rounded-lg bg-surface p-8 text-center max-w-md">
          {result.passed ? (
            <>
              <p className={`font-mono text-xs mb-2 ${TEXT_MAP[accent]}`}>CHAPTER COMPLETE</p>
              <p className="font-display text-3xl font-semibold mb-2">{result.score}%</p>
              <p className="text-sm text-muted mb-6">
                {result.correctCount}/{result.totalQuestions} correct — nice work.
              </p>
              {result.domainCompleted && (
                <p className={`text-sm mb-6 ${TEXT_MAP[accent]}`}>🎉 You've completed this entire domain!</p>
              )}
              <div className="flex gap-3 justify-center">
                {result.nextTopicId ? (
                  <button
                    onClick={() => navigate(`/learn/${result.nextTopicId}`)}
                    className={`${BTN_MAP[accent]} text-invert font-medium rounded-md px-4 py-2`}
                  >
                    Continue to next chapter →
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/learn")}
                    className={`${BTN_MAP[accent]} text-invert font-medium rounded-md px-4 py-2`}
                  >
                    Back to Learning Path
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-mono text-xs mb-2 text-muted">NOT QUITE YET</p>
              <p className="font-display text-3xl font-semibold mb-2">{result.score}%</p>
              <p className="text-sm text-muted mb-6">
                You need {result.requiredScore}% to pass. Review the chapter and try again — retrying is
                part of learning.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setMode("read")}
                  className="border border-line hover:border-muted text-sm rounded-md px-4 py-2 text-ink"
                >
                  Review chapter
                </button>
                <button
                  onClick={startQuiz}
                  className={`${BTN_MAP[accent]} text-invert font-medium rounded-md px-4 py-2`}
                >
                  Retry check
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
