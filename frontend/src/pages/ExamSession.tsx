import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api, ExamSessionState } from "../api/client";

const DOT_MAP: Record<string, string> = { wire: "bg-wire", signal: "bg-signal", node: "bg-node" };

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<ExamSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const submittedRef = useRef(false);

  const load = useCallback(() => {
    if (!sessionId) return;
    api
      .getExamSession(sessionId)
      .then((s) => {
        setSession(s);
        setRemainingMs(s.remainingMs);
        if (s.status !== "IN_PROGRESS") {
          navigate(`/exam/${sessionId}/review`, { replace: true });
        }
      })
      .catch((e) => setError(e.message));
  }, [sessionId, navigate]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Local countdown ticks every second; auto-submits the moment it hits zero.
  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0 && !submittedRef.current) {
          submittedRef.current = true;
          handleSubmit();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  const current = session?.questions[index];
  const answeredCount = session ? Object.keys(session.answers).length : 0;

  const selected = useMemo(() => {
    if (!session || !current) return [];
    return session.answers[current.id] ?? [];
  }, [session, current]);

  async function toggleChoice(choiceId: string) {
    if (!session || !current || !sessionId) return;
    const isMulti = current.multiSelect;
    let next: string[];
    if (isMulti) {
      next = selected.includes(choiceId) ? selected.filter((c) => c !== choiceId) : [...selected, choiceId];
    } else {
      next = [choiceId];
    }

    setSession((prev) => (prev ? { ...prev, answers: { ...prev.answers, [current.id]: next } } : prev));
    try {
      await api.saveExamAnswer(sessionId, current.id, next);
    } catch {
      // Progress will resync next time the session is fetched; not fatal mid-exam.
    }
  }

  async function handleSubmit() {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      await api.submitExam(sessionId);
      navigate(`/exam/${sessionId}/review`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  if (!user) {
    return <p className="text-muted">Sign in to access the practice exam.</p>;
  }

  if (error) {
    return <p className="text-sm text-signal">{error}</p>;
  }

  if (!session || !current) {
    return <p className="text-sm text-muted">Loading exam session…</p>;
  }

  const accent = DOMAINS[current.domain as keyof typeof DOMAINS].color;
  const low = remainingMs < 5 * 60 * 1000;

  return (
    <div>
      {/* Sticky header: timer + progress, always visible while scrolling a long question */}
      <div className="sticky top-0 -mx-6 px-6 py-3 bg-canvas/95 backdrop-blur border-b border-line z-10 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className={`font-mono text-lg tabular-nums ${low ? "text-signal" : "text-ink"}`}>
            {formatClock(remainingMs)}
          </span>
          <span className="font-mono text-xs text-muted">
            {answeredCount}/{session.totalQuestions} answered
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setNavOpen((o) => !o)} className="font-mono text-xs text-muted hover:text-ink">
            {navOpen ? "Hide" : "Question list"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-signal text-invert font-medium rounded-md px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit exam"}
          </button>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-raised overflow-hidden mb-6">
        <div
          className="h-full rounded-full bg-signal transition-all"
          style={{ width: `${(answeredCount / session.totalQuestions) * 100}%` }}
        />
      </div>

      {navOpen && (
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 mb-6 border border-line rounded-lg p-3 bg-surface">
          {session.questions.map((q, i) => {
            const isAnswered = !!session.answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => {
                  setIndex(i);
                  setNavOpen(false);
                }}
                className={`font-mono text-xs rounded h-8 flex items-center justify-center border transition-colors ${
                  i === index
                    ? "border-signal text-ink"
                    : isAnswered
                    ? "border-line bg-raised text-ink"
                    : "border-line text-muted"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}

      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full inline-block ${DOT_MAP[accent]}`} />
          <p className="font-mono text-xs text-muted">
            Question {index + 1} of {session.totalQuestions} · {DOMAINS[current.domain as keyof typeof DOMAINS].label}
          </p>
        </div>

        <p className="text-lg mb-4 leading-relaxed whitespace-pre-line">{current.prompt}</p>

        {current.multiSelect && <p className="font-mono text-xs text-signal mb-3">SELECT ALL THAT APPLY</p>}

        {current.diagramSvg && (
          <div
            className="mb-5 border border-line rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: current.diagramSvg }}
          />
        )}

        <div className="space-y-2 mb-8">
          {current.choices.map((choice) => {
            const isSelected = selected.includes(choice.id);
            return (
              <button
                key={choice.id}
                onClick={() => toggleChoice(choice.id)}
                className={`w-full text-left flex items-center gap-3 border rounded-md px-4 py-3 text-sm transition-colors ${
                  isSelected ? "border-signal" : "border-line hover:border-muted"
                }`}
              >
                {current.multiSelect && (
                  <span
                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected ? "bg-signal border-signal" : "border-line"
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                )}
                {choice.text}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="font-mono text-xs text-muted hover:text-ink disabled:opacity-30"
          >
            ← Previous
          </button>
          {index + 1 < session.totalQuestions ? (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="bg-signal text-invert font-medium rounded-md px-4 py-2 text-sm"
            >
              Next question →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-signal text-invert font-medium rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit exam"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
