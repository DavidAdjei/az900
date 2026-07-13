import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DOMAIN_ORDER, DomainId, DOMAINS } from "../domains";
import { useAuth } from "../context/AuthContext";
import { api, PracticeQuestion } from "../api/client";

const TAB_ACTIVE: Record<string, string> = {
  wire: "border-wire text-ink",
  signal: "border-signal text-ink",
  node: "border-node text-ink",
};

export function Quiz() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const domain = (params.get("domain") as DomainId) || "CLOUD_CONCEPTS";

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctChoiceIds: string[]; explanation: string } | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  async function startQuiz() {
    setLoading(true);
    setFinished(false);
    setIndex(0);
    setScore(0);
    setSelected([]);
    setSubmitted(false);
    setFeedback(null);
    const { questions } = await api.getQuestions(domain, 10);
    setQuestions(questions);
    setLoading(false);
  }

  useEffect(() => {
    if (user) startQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, user]);

  const current = questions[index];

  function toggleChoice(choiceId: string) {
    if (submitted) return;
    if (current.multiSelect) {
      setSelected((prev) => (prev.includes(choiceId) ? prev.filter((c) => c !== choiceId) : [...prev, choiceId]));
    } else {
      setSelected([choiceId]);
    }
  }

  async function handleSubmit() {
    if (selected.length === 0 || submitted) return;
    setSubmitted(true);
    const result = await api.submitAttempt(current.id, selected);
    setFeedback(result);
    if (result.correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setSubmitted(false);
    setFeedback(null);
  }

  if (!user) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold mb-4">Quiz</h1>
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md">
          <p className="text-muted mb-4 leading-relaxed">
            Sign in to start practicing. Your answers and score history are saved so you can see
            which domain needs more work.
          </p>
          <Link
            to="/login"
            className="inline-block bg-signal text-invert font-medium rounded-md px-4 py-2"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Quiz</h1>

      <div className="flex gap-1 border-b border-line mb-8">
        {DOMAIN_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => setParams({ domain: id })}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              domain === id ? TAB_ACTIVE[DOMAINS[id].color] : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {DOMAINS[id].label}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted text-sm">Loading questions…</p>}

      {!loading && finished && (
        <div className="border border-line rounded-lg p-6 bg-surface max-w-md">
          <p className="font-mono text-xs text-muted mb-2">RESULT</p>
          <p className="font-display text-3xl font-semibold mb-4">
            {score} / {questions.length}
          </p>
          <button
            onClick={startQuiz}
            className="bg-signal text-invert font-medium rounded-md px-4 py-2"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !finished && current && (
        <div className="max-w-xl">
          <p className="font-mono text-xs text-muted mb-3">
            Question {index + 1} of {questions.length} · Score {score}
          </p>
          <p className="text-lg mb-4 leading-relaxed whitespace-pre-line">{current.prompt}</p>

          {current.multiSelect && (
            <p className="font-mono text-xs text-signal mb-3">SELECT ALL THAT APPLY</p>
          )}

          {current.diagramSvg && (
            <div
              className="mb-5 border border-line rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: current.diagramSvg }}
            />
          )}

          <div className="space-y-2">
            {current.choices.map((choice) => {
              const isSelected = selected.includes(choice.id);
              const isCorrectChoice = feedback && feedback.correctChoiceIds.includes(choice.id);
              let style = "border-line hover:border-muted";
              if (feedback) {
                if (isCorrectChoice) style = "border-wire bg-wire/10";
                else if (isSelected && !isCorrectChoice) style = "border-red-400 bg-red-400/10";
              } else if (isSelected) {
                style = "border-signal";
              }
              return (
                <button
                  key={choice.id}
                  onClick={() => toggleChoice(choice.id)}
                  disabled={submitted}
                  className={`w-full text-left flex items-center gap-3 border rounded-md px-4 py-3 text-sm transition-colors ${style}`}
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

          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0}
              className="mt-5 bg-signal text-invert font-medium rounded-md px-4 py-2 text-sm disabled:opacity-40"
            >
              Submit answer
            </button>
          )}

          {feedback && (
            <div className="mt-5 border border-line rounded-md p-4 bg-surface">
              <p className={`text-sm font-medium mb-2 ${feedback.correct ? "text-wire" : "text-red-400"}`}>
                {feedback.correct ? "Correct" : "Not quite"}
              </p>
              <p className="text-sm text-muted leading-relaxed mb-4">{feedback.explanation}</p>
              <button
                onClick={handleNext}
                className="bg-signal text-invert font-medium rounded-md px-4 py-2 text-sm"
              >
                {index + 1 >= questions.length ? "See result" : "Next question"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
