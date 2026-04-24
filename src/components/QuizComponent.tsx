import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Option {
  id: number;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: number;
  lesson_id: number;
  type: string;
  question_text: string;
  explanation: string;
  points: number;
  options: Option[];
}

export type QuizInitialSize = 15 | 25 | 50;
type TestSize = 0 | QuizInitialSize;

/**
 * El RPC `generate_random_quiz` devuelve `data` como array plano Question[].
 * Solo se asegura que sea un array antes de asignarlo al estado.
 */
function questionListFromRpc(data: unknown): Question[] {
  return Array.isArray(data) ? (data as Question[]) : [];
}

function totalPossiblePoints(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

type QuizComponentProps = {
  userId: string;
  /** Si viene definido, se omite el menú interno y se carga el cuestionario al montar. */
  initialSize?: QuizInitialSize;
  /** Callback al cancelar desde el examen (p. ej. volver al dashboard). */
  onRequestExit?: () => void;
};

export default function QuizComponent({
  userId,
  initialSize,
  onRequestExit,
}: QuizComponentProps) {
  const isEmbedded = initialSize != null;

  const [testSize, setTestSize] = useState<TestSize>(initialSize ?? 0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(() => isEmbedded);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const requestedCount = testSize;
  const maxScore = totalPossiblePoints(questions);

  const resetToMenu = useCallback(() => {
    setTestSize(0);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setIsLoading(false);
    setIsFinished(false);
    setSelectedAnswer(null);
    setLoadError(null);
    setCorrectAnswersCount(0);
  }, []);

  const startQuiz = useCallback(
    async (size: QuizInitialSize) => {
      setLoadError(null);
      setTestSize(size);
      setIsLoading(true);
      setQuestions([]);
      setCurrentIndex(0);
      setScore(0);
      setIsFinished(false);
      setSelectedAnswer(null);
      setCorrectAnswersCount(0);

      try {
        const { data, error } = await supabase.rpc("generate_random_quiz", {
          p_user_id: userId,
          p_question_count: size,
        });

        if (error) {
          console.error("[QuizComponent] RPC generate_random_quiz:", error);
          setLoadError(error.message || "No se pudo cargar el cuestionario.");
          setTestSize(0);
          return;
        }

        const list = questionListFromRpc(data);
        if (list.length === 0) {
          console.warn(
            "[QuizComponent] generate_random_quiz devolvió 0 preguntas."
          );
          setLoadError(
            "No hay preguntas disponibles con los módulos completados."
          );
          setTestSize(0);
          return;
        }

        setQuestions(list);
      } catch (e) {
        console.error("[QuizComponent] startQuiz:", e);
        setLoadError("Error inesperado al cargar el cuestionario.");
        setTestSize(0);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (initialSize == null) return;
    void startQuiz(initialSize);
  }, [initialSize, startQuiz]);

  const handleRetry = useCallback(() => {
    if (isEmbedded && initialSize != null) {
      void startQuiz(initialSize);
      return;
    }
    resetToMenu();
  }, [initialSize, isEmbedded, resetToMenu, startQuiz]);

  const handleExit = useCallback(() => {
    resetToMenu();
    onRequestExit?.();
  }, [onRequestExit, resetToMenu]);

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const accuracyPercent =
    totalQuestions > 0
      ? Math.round((correctAnswersCount / totalQuestions) * 100)
      : 0;
  const showConfig = !isEmbedded && testSize === 0 && !isLoading;
  const showExam =
    testSize !== 0 && !isLoading && !isFinished && totalQuestions > 0;
  const showResults = isFinished && totalQuestions > 0;
  const showExitDuringFlow =
    Boolean(onRequestExit) &&
    (showExam || (isEmbedded && isLoading) || (isEmbedded && Boolean(loadError)));

  const handleSelectOption = (optionId: number) => {
    if (selectedAnswer !== null || !currentQuestion) return;
    setSelectedAnswer(optionId);
  };

  const handleNext = () => {
    if (!currentQuestion || selectedAnswer === null) return;

    const chosen = currentQuestion.options.find((o) => o.id === selectedAnswer);
    if (chosen?.is_correct) {
      setScore((s) => s + (Number(currentQuestion.points) || 0));
      setCorrectAnswersCount((c) => c + 1);
    }

    if (currentIndex >= totalQuestions - 1) {
      setIsFinished(true);
      setSelectedAnswer(null);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
  };

  return (
    <div className="quiz-root mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {showExitDuringFlow && (
        <div className="quiz-exam__toolbar flex justify-end">
          <button
            type="button"
            className="quiz-exam__exit-dashboard rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={handleExit}
          >
            Volver al Dashboard
          </button>
        </div>
      )}

      {loadError && (
        <p
          className="quiz-error rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {isLoading && (
        <div className="quiz-loading flex flex-col items-center justify-center gap-3 py-12">
          <div
            className="quiz-loading__spinner h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600"
            aria-hidden
          />
          <p className="quiz-loading__text text-sm text-slate-600 dark:text-slate-400">
            Preparando tu evaluación…
          </p>
        </div>
      )}

      {showConfig && (
        <section className="quiz-config space-y-6">
          <header className="quiz-config__header text-center">
            <h2 className="quiz-config__title text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Evaluación adaptativa
            </h2>
            <p className="quiz-config__subtitle mt-2 text-slate-600 dark:text-slate-400">
              Elige la duración. Las preguntas se basan en los módulos que ya
              completaste.
            </p>
          </header>
          <div className="quiz-config__actions grid gap-3 sm:grid-cols-3">
            {(
              [
                { size: 15 as const, label: "Corta", hint: "15 preguntas" },
                { size: 25 as const, label: "Media", hint: "25 preguntas" },
                { size: 50 as const, label: "Larga", hint: "50 preguntas" },
              ] as const
            ).map(({ size, label, hint }) => (
              <button
                key={size}
                type="button"
                className="quiz-config__btn rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-sky-600 dark:hover:bg-slate-800/80"
                onClick={() => void startQuiz(size)}
              >
                <span className="quiz-config__btn-label block font-semibold text-slate-900 dark:text-white">
                  {label}
                </span>
                <span className="quiz-config__btn-hint mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showExam && currentQuestion && (
        <section className="quiz-exam space-y-6">
          <div className="quiz-exam__progress flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="quiz-exam__progress-label">
              Pregunta{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentIndex + 1}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {totalQuestions}
              </span>
            </span>
            {requestedCount > totalQuestions && (
              <span className="quiz-exam__progress-note text-xs text-amber-700 dark:text-amber-400">
                Disponibles: {totalQuestions}
              </span>
            )}
          </div>

          <div className="quiz-exam__question rounded-xl bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
            <p className="quiz-exam__question-text text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">
              {currentQuestion.question_text}
            </p>
          </div>

          <ul className="quiz-exam__options flex list-none flex-col gap-2 p-0">
            {currentQuestion.options.map((opt) => {
              const locked = selectedAnswer !== null;
              const isSelected = selectedAnswer === opt.id;
              const showSolution = locked;
              const isCorrect = opt.is_correct;
              let stateClass =
                "quiz-exam__option border-slate-200 bg-white hover:border-sky-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-sky-500";
              if (showSolution) {
                if (isCorrect) {
                  stateClass =
                    "quiz-exam__option quiz-exam__option--correct border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40";
                } else if (isSelected && !isCorrect) {
                  stateClass =
                    "quiz-exam__option quiz-exam__option--incorrect border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/40";
                } else {
                  stateClass =
                    "quiz-exam__option border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800/80";
                }
              }

              return (
                <li key={opt.id} className="quiz-exam__option-item">
                  <button
                    type="button"
                    disabled={locked}
                    className={`quiz-exam__option w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition disabled:cursor-default ${stateClass}`}
                    onClick={() => handleSelectOption(opt.id)}
                  >
                    {opt.option_text}
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedAnswer !== null && (
            <div className="quiz-exam__feedback space-y-4">
              <div className="quiz-exam__explanation rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <p className="quiz-exam__explanation-label mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Explicación
                </p>
                <p className="quiz-exam__explanation-text">
                  {currentQuestion.explanation}
                </p>
              </div>
              <button
                type="button"
                className="quiz-exam__next w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                onClick={handleNext}
              >
                {currentIndex >= totalQuestions - 1 ? "Ver resultados" : "Siguiente"}
              </button>
            </div>
          )}
        </section>
      )}

      {showResults && (
        <section className="quiz-results space-y-6 text-center">
          <h2 className="quiz-results__title text-2xl font-bold text-slate-900 dark:text-white">
            Resultados
          </h2>
          <div className="quiz-results__stats space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-600 dark:bg-slate-800/60">
            <p className="quiz-results__score text-lg text-slate-700 dark:text-slate-300">
              Puntuación:{" "}
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {score}
              </span>
              {maxScore > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}
                  / {maxScore}
                </span>
              )}
            </p>
            <p className="quiz-results__percent text-3xl font-bold text-slate-900 dark:text-white">
              {accuracyPercent}%
              <span className="quiz-results__percent-label ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
                de aciertos ({correctAnswersCount}/{totalQuestions})
              </span>
            </p>
          </div>
          <div className="quiz-results__actions flex flex-col gap-3">
            <button
              type="button"
              className="quiz-results__retry w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500"
              onClick={handleRetry}
            >
              Volver a intentar
            </button>
            {onRequestExit && (
              <button
                type="button"
                className="quiz-results__exit-dashboard text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                onClick={handleExit}
              >
                Volver al Dashboard
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
