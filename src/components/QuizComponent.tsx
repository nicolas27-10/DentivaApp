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
  const testTypeLabel =
    requestedCount === 15
      ? "Prueba rápida"
      : requestedCount === 25
        ? "Prueba estándar"
        : requestedCount === 50
          ? "Simulacro intensivo"
          : "Evaluación adaptativa";

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
    <div className="quiz-root mx-auto max-w-full space-y-6 rounded-3xl border border-border/70 bg-white/70 p-6 shadow-[0_12px_32px_rgba(16,24,40,0.08)] backdrop-blur-sm sm:p-8">
      {/* {showExitDuringFlow && (
        <div className="quiz-exam__toolbar flex justify-end">
          <button
            type="button"
            className="quiz-exam__exit-dashboard inline-flex items-center gap-2 rounded-full border border-transparent px-1 py-1 text-sm font-semibold text-textMain/60 transition hover:text-primary"
            onClick={handleExit}
          >
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E4F6FD] text-primary"
            >
              ←
            </span>
            <span className="pr-2">Volver</span>
          </button>
        </div>
      )} */}

      {loadError && (
        <p
          className="quiz-error rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {isLoading && (
        <div className="quiz-loading flex flex-col items-center justify-center gap-3 py-12">
          <div
            className="quiz-loading__spinner h-10 w-10 animate-spin rounded-full border-2 border-[#C8E8F5] border-t-primary"
            aria-hidden
          />
          <p className="quiz-loading__text text-sm font-medium text-textMain/65">
            Preparando tu evaluación…
          </p>
        </div>
      )}

      {showConfig && (
        <section className="quiz-config space-y-6">
          <header className="quiz-config__header text-center">
            <h2 className="quiz-config__title text-2xl font-bold tracking-tight text-textMain sm:text-3xl">
              Evaluación adaptativa
            </h2>
            <p className="quiz-config__subtitle mt-2 text-sm text-textMain/65 sm:text-base">
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
                className="quiz-config__btn rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-[#E4F6FD] hover:shadow-sm"
                onClick={() => void startQuiz(size)}
              >
                <span className="quiz-config__btn-label block font-semibold text-textMain">
                  {label}
                </span>
                <span className="quiz-config__btn-hint mt-1 block text-xs uppercase tracking-wide text-textMain/50">
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showExam && currentQuestion && (
        <section className="quiz-exam space-y-6">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-textMain/50">
              {testTypeLabel}
            </p>
            <h2 className="text-xl font-bold text-textMain sm:text-2xl">
              Modo examen
            </h2>
          </header>

          <div className="quiz-exam__progress rounded-2xl border border-primary/15 bg-gradient-to-r from-[#F4FBFF] to-[#EEF8FD] px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-textMain/75">
              <span className="quiz-exam__progress-label">
                Pregunta{" "}
                <span className="font-bold text-textMain">{currentIndex + 1}</span>{" "}
                de <span className="font-bold text-textMain">{totalQuestions}</span>
              </span>
              {requestedCount > totalQuestions && (
                <span className="quiz-exam__progress-note text-xs font-semibold text-amber-700">
                  Disponibles: {totalQuestions}
                </span>
              )}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#67c3e7] transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((currentIndex + 1) / totalQuestions) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="quiz-exam__question rounded-2xl border border-border bg-background p-6 sm:p-7">
            <p className="quiz-exam__question-text break-words text-base font-semibold leading-relaxed text-textMain sm:text-lg">
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
                "quiz-exam__option border-border bg-background text-textMain hover:border-primary/45 hover:bg-[#E4F6FD]";
              if (showSolution) {
                if (isCorrect) {
                  stateClass =
                    "quiz-exam__option quiz-exam__option--correct border-emerald-400 bg-emerald-50 text-emerald-700";
                } else if (isSelected && !isCorrect) {
                  stateClass =
                    "quiz-exam__option quiz-exam__option--incorrect border-red-400 bg-red-50 text-red-700";
                } else {
                  stateClass =
                    "quiz-exam__option border-border bg-background text-textMain/60 opacity-75";
                }
              }

              return (
                <li key={opt.id} className="quiz-exam__option-item">
                  <button
                    type="button"
                    disabled={locked}
                    className={`quiz-exam__option w-full rounded-2xl border-2 px-4 py-3 text-left text-sm transition disabled:cursor-default ${stateClass}`}
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
              <button
                type="button"
                className="quiz-exam__next w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a9bc4]"
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
          <h2 className="quiz-results__title text-2xl font-bold text-textMain sm:text-3xl">
            Resultados
          </h2>
          <div className="quiz-results__stats space-y-2 rounded-2xl border border-border bg-background px-6 py-8">
            <p className="quiz-results__score text-lg text-textMain/80">
              Puntuación:{" "}
              <span className="font-bold text-primary">
                {score}
              </span>
              {maxScore > 0 && (
                <span className="text-textMain/55">
                  {" "}
                  / {maxScore}
                </span>
              )}
            </p>
            <p className="quiz-results__percent text-3xl font-bold text-textMain">
              {accuracyPercent}%
              <span className="quiz-results__percent-label ml-2 text-base font-normal text-textMain/55">
                de aciertos ({correctAnswersCount}/{totalQuestions})
              </span>
            </p>
          </div>
          <div className="quiz-results__actions flex flex-col gap-3">
            <button
              type="button"
              className="quiz-results__retry w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-textMain transition hover:border-primary/45 hover:bg-[#E4F6FD]"
              onClick={handleRetry}
            >
              Volver a intentar
            </button>
            {onRequestExit && (
              <button
                type="button"
                className="quiz-results__exit-dashboard text-sm font-semibold text-textMain/60 underline-offset-2 transition hover:text-primary hover:underline"
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
