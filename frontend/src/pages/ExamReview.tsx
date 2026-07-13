import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

type Review = Awaited<ReturnType<typeof api.getExamReview>>;

export function ExamReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "incorrect">("all");

  useEffect(() => {
    if (!user || !sessionId) return;
    api.getExamReview(sessionId).then(setReview).catch((e) => setError(e.message));
  }, [user, sessionId]);

  if (!user) return <p className="text-muted">Sign in to view exam results.</p>;
  if (error) return <p className="text-sm text-signal">{error}</p>;
  if (!review) return <p className="text-sm text-muted">Loading results…</p>;

  const passed = (review.score ?? 0) >= 70;
  const questions = filter === "incorrect" ? review.questions.filter((q) => !q.correct) : review.questions;

  return (
    <div className="max-w-2xl">
      <Link to="/exam" className="font-mono text-xs text-muted hover:text-ink inline-block mb-6">
        ← Back to Practice Exam
      </Link>

      <div className="border border-line rounded-lg bg-surface p-8 text-center mb-10">
        <p className={`font-mono text-xs mb-2 ${passed ? "text-wire" : "text-signal"}`}>
          {review.status === "EXPIRED" ? "TIME EXPIRED" : passed ? "PASS" : "BELOW PASSING"}
        </p>
        <p className="font-display text-4xl font-semibold mb-2">{review.score}%</p>
        <p className="text-sm text-muted">
          {review.correctCount}/{review.totalQuestions} correct
          {review.status === "EXPIRED" && " — the 2-hour timer ran out before you submitted"}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs text-muted">ANSWER REVIEW</p>
        <div className="flex gap-1 border border-line rounded-md p-0.5">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1 rounded ${filter === "all" ? "bg-raised text-ink" : "text-muted"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("incorrect")}
            className={`text-xs px-3 py-1 rounded ${filter === "incorrect" ? "bg-raised text-ink" : "text-muted"}`}
          >
            Missed only
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const accent = DOMAINS[q.domain as keyof typeof DOMAINS].color;
          return (
            <div key={q.id} className="border border-line rounded-lg bg-surface p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-xs text-muted">
                  Q{i + 1} · {DOMAINS[q.domain as keyof typeof DOMAINS].label}
                </p>
                <span className={`font-mono text-xs ${q.correct ? "text-wire" : "text-signal"}`}>
                  {q.correct ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm mb-4 leading-relaxed whitespace-pre-line">{q.prompt}</p>

              {q.diagramSvg && (
                <div
                  className="mb-4 border border-line rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: q.diagramSvg }}
                />
              )}

              <div className="space-y-1.5 mb-4">
                {q.choices.map((choice) => {
                  const isCorrect = q.correctChoiceIds.includes(choice.id);
                  const wasChosen = q.chosenChoiceIds.includes(choice.id);
                  let style = "border-line text-muted";
                  if (isCorrect) style = "border-wire bg-wire/10 text-ink";
                  else if (wasChosen && !isCorrect) style = "border-red-400 bg-red-400/10 text-ink";
                  return (
                    <div key={choice.id} className={`border rounded-md px-3 py-2 text-sm ${style}`}>
                      {choice.text}
                      {wasChosen && !isCorrect && <span className="text-red-400 font-mono text-xs ml-2">your answer</span>}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-muted leading-relaxed">{q.explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
