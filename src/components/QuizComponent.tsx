import { useCallback, useEffect, useRef, useState } from "react";
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
type QuizState = "config" | "loading" | "resume_prompt" | "active" | "results" | "review" | "empty";

interface SavedSessionData {
  sessionId: string | null;
  questions: Question[];
  answers: Record<number, number>;
  currentIndex: number;
  totalQuestions: number;
}

function questionListFromRpc(data: unknown): Question[] {
  return Array.isArray(data) ? (data as Question[]) : [];
}

function totalPossiblePoints(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

type QuizComponentProps = {
  userId: string;
  initialSize?: QuizInitialSize;
  onRequestExit?: () => void;
  accessToken?: string;
};

export default function QuizComponent({
  userId,
  initialSize,
  onRequestExit,
  accessToken,
}: QuizComponentProps) {
  const isEmbedded = initialSize != null;
  const hasCheckedExistingRef = useRef(false);

  // Estados principales
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [testSize, setTestSize] = useState<TestSize>(initialSize ?? 0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Estado de la sesión actual
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [pendingResumeData, setPendingResumeData] = useState<SavedSessionData | null>(null);

  // Resultados y controles UI
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const getStorageKey = (size: number) => `dentiva_quiz_session_${userId}_${size}`;

  const requestedCount = testSize;
  const maxScore = totalPossiblePoints(questions);
  const testTypeLabel =
    requestedCount === 15 ? "Schnelltest"
      : requestedCount === 25 ? "Standardtest"
      : requestedCount === 50 ? "Intensivsimulation"
      : "Adaptive Bewertung";

  // Inicializar Supabase Auth
  const initSupabaseAuth = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: "",
        });
      }
    } catch (e) {
      console.warn("No se pudo inicializar la sesión de Supabase:", e);
    }
  }, [accessToken]);

  const clearSessionStorage = (size: number) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey(size));
    }
  };

  const resetToMenu = useCallback(() => {
    setQuizState("config");
    setTestSize(0);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setSessionId(null);
    setScore(0);
    setCorrectAnswersCount(0);
    setLoadError(null);
    setShowFinishModal(false);
    setPendingResumeData(null);
    hasCheckedExistingRef.current = false;
  }, []);

  // Iniciar prueba nueva
  const startFreshQuiz = async (size: QuizInitialSize) => {
    await initSupabaseAuth();
    setLoadError(null);
    setTestSize(size);
    setQuizState("loading");
    setPendingResumeData(null);
    clearSessionStorage(size);

    try {
      let reqOptions: any = {};
      if (accessToken) {
        reqOptions.headers = { Authorization: `Bearer ${accessToken}` };
      }

      await supabase
        .from("quiz_sessions")
        .update({ status: "abandoned" })
        .eq("user_id", userId)
        .eq("total_questions", size)
        .eq("status", "in_progress")
        .setHeader("Authorization", `Bearer ${accessToken}`);

      const { data, error } = await supabase.rpc(
        "generate_random_quiz",
        {
          p_user_id: userId,
          p_question_count: size,
        },
        reqOptions
      );

      if (error) throw error;

      const list = questionListFromRpc(data);
      if (list.length === 0) {
        setQuizState("empty");
        return;
      }

      const { data: newSession, error: sessionError } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: userId,
          total_questions: size,
          question_ids: list.map((q) => q.id),
          answers: {},
          current_index: 0,
          status: "in_progress",
        })
        .select()
        .single()
        .setHeader("Authorization", `Bearer ${accessToken}`);

      if (sessionError) console.error("Error creando sesión:", sessionError);

      const newSessionId = newSession?.id || null;
      setQuestions(list);
      setAnswers({});
      setCurrentIndex(0);
      setSessionId(newSessionId);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          getStorageKey(size),
          JSON.stringify({
            sessionId: newSessionId,
            questions: list,
            answers: {},
            currentIndex: 0,
            totalQuestions: size,
          })
        );
      }

      setQuizState("active");
    } catch (e) {
      console.error("[QuizComponent] startFreshQuiz:", e);
      setLoadError("Unerwarteter Fehler beim Laden des Fragebogens.");
      setQuizState("empty");
    }
  };

  const resumeSavedQuiz = () => {
    if (!pendingResumeData) return;
    setQuestions(pendingResumeData.questions);
    setAnswers(pendingResumeData.answers);
    setCurrentIndex(pendingResumeData.currentIndex);
    setSessionId(pendingResumeData.sessionId);
    setQuizState("active");
  };

  const checkAndInitQuiz = useCallback(
    async (size: QuizInitialSize) => {
      await initSupabaseAuth();
      setLoadError(null);
      setTestSize(size);
      setQuizState("loading");

      if (typeof window !== "undefined") {
        const localData = localStorage.getItem(getStorageKey(size));
        if (localData) {
          try {
            const parsed: SavedSessionData = JSON.parse(localData);
            if (parsed.questions && parsed.questions.length > 0) {
              setPendingResumeData(parsed);
              setQuizState("resume_prompt");
              return;
            }
          } catch (e) {
            console.error("Error parseando sesión local:", e);
          }
        }
      }

      try {
        const { data: existingSession, error: checkError } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("total_questions", size)
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .setHeader("Authorization", `Bearer ${accessToken}`);

        if (existingSession && existingSession.question_ids?.length > 0) {
          const { data: qData, error: qError } = await supabase
            .from("exercises")
            .select("id, lesson_id, type, question_text, explanation, points, options:exercise_options(id, option_text, is_correct)")
            .in("id", existingSession.question_ids)
            .setHeader("Authorization", `Bearer ${accessToken}`);

          if (!qError && qData && qData.length > 0) {
            const orderedQuestions: Question[] = existingSession.question_ids
              .map((id: number) => qData.find((q: any) => Number(q.id) === Number(id)))
              .filter(Boolean);

            if (orderedQuestions.length > 0) {
              const rawAnswers = existingSession.answers || {};
              const parsedAnswers: Record<number, number> = {};
              Object.entries(rawAnswers).forEach(([k, v]) => {
                parsedAnswers[Number(k)] = Number(v);
              });

              const sessionData: SavedSessionData = {
                sessionId: existingSession.id,
                questions: orderedQuestions,
                answers: parsedAnswers,
                currentIndex: Math.min(existingSession.current_index || 0, orderedQuestions.length - 1),
                totalQuestions: size,
              };

              setPendingResumeData(sessionData);
              setQuizState("resume_prompt");
              return;
            }
          }
        }
      } catch (e) {
        console.warn("[QuizComponent] Error verificando sesión en DB:", e);
      }

      await startFreshQuiz(size);
    },
    [userId, accessToken, initSupabaseAuth]
  );

  useEffect(() => {
    if (initialSize != null && !hasCheckedExistingRef.current) {
      hasCheckedExistingRef.current = true;
      void checkAndInitQuiz(initialSize);
    } else if (initialSize == null) {
      setQuizState("config");
    }
  }, [initialSize, checkAndInitQuiz]);

  const handleSelectOption = (optionId: number) => {
    if (quizState !== "active" || !questions[currentIndex]) return;

    const currentQuestionId = questions[currentIndex].id;
    const newAnswers = { ...answers, [currentQuestionId]: optionId };
    setAnswers(newAnswers);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        getStorageKey(testSize),
        JSON.stringify({
          sessionId,
          questions,
          answers: newAnswers,
          currentIndex,
          totalQuestions: testSize,
        })
      );
    }

    if (sessionId) {
      supabase
        .from("quiz_sessions")
        .update({ answers: newAnswers })
        .eq("id", sessionId)
        .setHeader("Authorization", `Bearer ${accessToken}`)
        .then();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          getStorageKey(testSize),
          JSON.stringify({
            sessionId,
            questions,
            answers,
            currentIndex: newIndex,
            totalQuestions: testSize,
          })
        );
      }

      if (sessionId) {
        supabase
          .from("quiz_sessions")
          .update({ current_index: newIndex })
          .eq("id", sessionId)
          .setHeader("Authorization", `Bearer ${accessToken}`)
          .then();
      }
    } else {
      setShowFinishModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          getStorageKey(testSize),
          JSON.stringify({
            sessionId,
            questions,
            answers,
            currentIndex: newIndex,
            totalQuestions: testSize,
          })
        );
      }

      if (sessionId) {
        supabase
          .from("quiz_sessions")
          .update({ current_index: newIndex })
          .eq("id", sessionId)
          .setHeader("Authorization", `Bearer ${accessToken}`)
          .then();
      }
    }
  };

  const handleFinishExam = async () => {
    setShowFinishModal(false);
    setIsSubmitting(true);
    let correct = 0;
    let earnedPoints = 0;
    const attemptsToInsert: any[] = [];

    questions.forEach((q) => {
      const pickedOptionId = answers[q.id];
      const pickedOption = q.options.find((o) => o.id === pickedOptionId);
      const isCorrect = pickedOption?.is_correct || false;

      if (isCorrect) {
        correct++;
        earnedPoints += Number(q.points) || 0;
      }

      if (pickedOptionId) {
        attemptsToInsert.push({
          user_id: userId,
          exercise_id: q.id,
          answer_text: pickedOption?.option_text || "",
          is_correct: isCorrect,
          points_earned: isCorrect ? Number(q.points) || 0 : 0,
        });
      }
    });

    setScore(earnedPoints);
    setCorrectAnswersCount(correct);

    // 1. Calculamos el porcentaje antes de guardar
    const totalQ = questions.length;
    const finalAccuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

    clearSessionStorage(testSize);

    if (sessionId) {
      // 2. Guardamos el score y el porcentaje en la base de datos
      await supabase
        .from("quiz_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          final_score: earnedPoints,
          accuracy_percentage: finalAccuracy
        })
        .eq("id", sessionId)
        .setHeader("Authorization", `Bearer ${accessToken}`);
    }

    if (attemptsToInsert.length > 0) {
      await supabase
        .from("user_attempts")
        .insert(attemptsToInsert)
        .setHeader("Authorization", `Bearer ${accessToken}`);
    }

    setIsSubmitting(false);
    setQuizState("results");
  };

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const answeredQuestionsCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestionsCount / totalQuestions) * 100) : 0;
  const accuracyPercent = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
  const unansweredCount = totalQuestions - answeredQuestionsCount;

  return (
    <div className="quiz-root mx-auto max-w-full space-y-6 rounded-3xl border border-border/70 bg-white/70 p-6 shadow-[0_12px_32px_rgba(16,24,40,0.08)] backdrop-blur-sm sm:p-8">
      
      {/* MODAL DE CONFIRMACIÓN */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-textMain mb-2">Test abschließen?</h3>
            
            {unansweredCount > 0 ? (
              <div className="mb-4 rounded-xl bg-amber-50 p-3 border border-amber-200">
                <p className="text-sm font-semibold text-amber-800">
                  Achtung: Du hast noch {unansweredCount} unbeantwortete {unansweredCount === 1 ? "Frage" : "Fragen"}.
                </p>
                <p className="text-xs text-amber-700/80 mt-1">Bist du sicher, dass du abgeben möchtest?</p>
              </div>
            ) : (
              <p className="text-sm text-textMain/70 mb-5">
                Du hast alle {totalQuestions} Fragen beantwortet. Möchtest du deine Antworten jetzt abgeben und die Ergebnisse sehen?
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleFinishExam}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3a9bc4] disabled:opacity-70 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                ) : (
                  "Ja, Test abgeben"
                )}
              </button>
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={isSubmitting}
                className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-sm font-semibold text-textMain transition hover:bg-slate-50 disabled:opacity-70"
              >
                Zurück zum Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA: CARGANDO */}
      {quizState === "loading" && (
        <div className="quiz-loading flex flex-col items-center justify-center gap-3 py-12">
          <div className="quiz-loading__spinner h-10 w-10 animate-spin rounded-full border-2 border-[#C8E8F5] border-t-primary" aria-hidden />
          <p className="quiz-loading__text text-sm font-medium text-textMain/65">
            Deine Bewertung wird vorbereitet…
          </p>
        </div>
      )}

      {/* PANTALLA: TEST EN CURSO ENCONTRADO */}
      {quizState === "resume_prompt" && pendingResumeData && (
        <div className="text-center py-8 px-4 max-w-md mx-auto space-y-6 animate-fade-in">
          
          {/* Icono mejorado con un borde más suave y redondeado */}
          <div className="w-20 h-20 bg-[#E4F6FD] text-primary rounded-full flex items-center justify-center mx-auto border-[6px] border-[#F4FBFF] shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-textMain">Laufender Test gefunden!</h3>
            <p className="text-sm text-textMain/70 leading-relaxed">
              Du hast einen unvollständigen Test mit{" "}
              <strong className="text-primary font-bold text-base">{Object.keys(pendingResumeData.answers).length}</strong> von{" "}
              <strong className="text-textMain/90 font-bold">{pendingResumeData.totalQuestions}</strong> beantworteten Fragen.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={resumeSavedQuiz}
              className="w-full h-12 flex items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#3a9bc4] shadow-md hover:-translate-y-0.5"
            >
              Test fortsetzen &rarr;
            </button>
            <button
              onClick={() => void startFreshQuiz(testSize as QuizInitialSize)}
              className="w-full h-12 flex items-center justify-center rounded-2xl border-2 border-border bg-white px-5 text-sm font-semibold text-textMain/70 transition hover:bg-slate-50 hover:text-textMain"
            >
              Verwerfen & Neu starten
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA: MÓDULO 1 INCOMPLETO */}
      {quizState === "empty" && (
        <div className="text-center py-10 px-4 max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3.5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-textMain">Keine Fragen freigeschaltet</h3>
          
          <p className="text-sm text-textMain/70 leading-relaxed">
            Um den Trainingsmodus nutzen zu können, musst du mindestens <strong>Modul 1</strong> vollständig abschließen. Die Tests basieren auf deinen abgeschlossenen Lektionen.
          </p>

          <div className="pt-2">
            <a
              href="/dashboard#lernen"
              className="inline-flex items-center justify-center w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3a9bc4] shadow-sm"
            >
              Zu den Modulen →
            </a>
          </div>
        </div>
      )}

      {/* MODO EXAMEN / REVISIÓN */}
      {(quizState === "active" || quizState === "review") && currentQuestion && (
        <section className="quiz-exam space-y-5">
          <header className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-textMain/50">
                {testTypeLabel} {quizState === "review" && " - Überprüfen"}
              </p>
              <h2 className="text-xl font-bold text-textMain sm:text-2xl">
                {quizState === "review" ? "Lösungen überprüfen" : "Prüfungsmodus"}
              </h2>
            </div>
            
            {quizState === "review" && (
              <button 
                onClick={() => setQuizState("results")}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Zurück zu den Ergebnissen
              </button>
            )}
            {quizState === "active" && (
              <button 
                onClick={() => setShowFinishModal(true)}
                className="text-sm font-semibold text-textMain/60 hover:text-primary hover:underline"
              >
                Vorzeitig abgeben
              </button>
            )}
          </header>

          {/* BARRA DE PROGRESO Y NAVEGADOR DE PREGUNTAS */}
          <div className="quiz-exam__progress rounded-2xl border border-primary/15 bg-gradient-to-r from-[#F4FBFF] to-[#EEF8FD] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-textMain/75">
              <span className="quiz-exam__progress-label">
                Frage <span className="font-bold text-textMain">{currentIndex + 1}</span> von <span className="font-bold text-textMain">{totalQuestions}</span>
              </span>
              <span className="text-xs font-semibold text-primary">
                Beantwortet: {answeredQuestionsCount} / {totalQuestions}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-primary/10 mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#67c3e7] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* PAGINADOR VISUAL */}
            <div 
              className="flex gap-2 overflow-x-auto px-1.5 pb-4 pt-2 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/50" 
              style={{ scrollbarWidth: 'thin' }}
            >
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                
                let btnClass = "flex-none h-8 w-8 min-w-[32px] rounded-full flex items-center justify-center text-[11px] font-bold transition-all ";
                
                if (quizState === "review") {
                  const pickedOptionId = answers[q.id];
                  const isCorrectOption = q.options.find(o => o.id === pickedOptionId)?.is_correct;
                  
                  if (isCorrectOption) {
                    btnClass += "bg-emerald-100 text-emerald-700 border border-emerald-300 ";
                  } else if (pickedOptionId) {
                    btnClass += "bg-red-100 text-red-700 border border-red-300 ";
                  } else {
                    btnClass += "bg-slate-100 text-slate-500 border border-slate-200 ";
                  }
                  
                  if (isCurrent) btnClass += "ring-2 ring-offset-1 ring-textMain/30 ";
                } else {
                  if (isCurrent) {
                    btnClass += "bg-primary text-white ring-2 ring-offset-1 ring-primary ";
                  } else if (isAnswered) {
                    btnClass += "bg-[#E4F6FD] text-primary border border-primary/30 ";
                  } else {
                    btnClass += "bg-white border border-border text-textMain/50 hover:bg-slate-50 ";
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={btnClass}
                    title={isAnswered ? "Beantwortet" : "Unbeantwortet"}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="quiz-exam__question rounded-2xl border border-border bg-background p-6 sm:p-7">
            <p className="quiz-exam__question-text break-words text-base font-semibold leading-relaxed text-textMain sm:text-lg">
              {currentQuestion.question_text}
            </p>
          </div>

          <ul className="quiz-exam__options flex list-none flex-col gap-2 p-0">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.id;
              const isCorrect = opt.is_correct;
              
              let stateClass = "border-border bg-background text-textMain hover:border-primary/45 hover:bg-slate-50";
              
              if (quizState === "active") {
                if (isSelected) {
                  stateClass = "border-primary bg-[#E4F6FD] text-primary ring-2 ring-primary/30 font-medium";
                }
              } else if (quizState === "review") {
                if (isCorrect) {
                  stateClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30 font-medium";
                } else if (isSelected && !isCorrect) {
                  stateClass = "border-red-400 bg-red-50 text-red-800 ring-2 ring-red-400/30 font-medium";
                } else {
                  stateClass = "border-border bg-background text-textMain/50 opacity-60 cursor-default";
                }
              }

              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={quizState === "review"}
                    className={`quiz-exam__option w-full rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${stateClass}`}
                    onClick={() => handleSelectOption(opt.id)}
                  >
                    {opt.option_text}
                  </button>
                </li>
              );
            })}
          </ul>

          {quizState === "review" && currentQuestion.explanation && (
            <div className="mt-6 rounded-2xl bg-blue-50/50 p-5 border border-blue-100">
              <h4 className="text-xs font-bold uppercase text-blue-600 mb-1">Erklärung</h4>
              <p className="text-sm text-blue-900/80 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* NAVEGACIÓN INFERIOR */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/50">
            <button
              type="button"
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-textMain/70 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handlePrev}
            >
              Zurück
            </button>

            {currentIndex >= totalQuestions - 1 ? (
              quizState === "active" ? (
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md transition hover:bg-[#3a9bc4] hover:-translate-y-0.5"
                  onClick={() => setShowFinishModal(true)}
                >
                  Test abschließen
                </button>
              ) : (
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md transition hover:bg-[#3a9bc4]"
                  onClick={() => setQuizState("results")}
                >
                  Ergebnisse anzeigen
                </button>
              )
            ) : (
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md transition hover:bg-[#3a9bc4] hover:-translate-y-0.5"
                onClick={handleNext}
              >
                Weiter
              </button>
            )}
          </div>
        </section>
      )}

      {/* RESULTADOS FINALES */}
      {quizState === "results" && (
        <section className="quiz-results space-y-6 text-center animate-fade-in">
          <h2 className="quiz-results__title text-2xl font-bold text-textMain sm:text-3xl">
            Ergebnisse
          </h2>
          
          <div className="quiz-results__stats space-y-2 rounded-2xl border border-border bg-background px-6 py-8 shadow-sm">
            <p className="quiz-results__score text-lg text-textMain/80">
              Punktzahl: <span className="font-bold text-primary">{score}</span>
              {maxScore > 0 && <span className="text-textMain/55"> / {maxScore}</span>}
            </p>
            <p className="quiz-results__percent text-3xl font-bold text-textMain">
              {accuracyPercent}%
              <span className="quiz-results__percent-label ml-2 text-base font-normal text-textMain/55">
                richtige Antworten ({correctAnswersCount}/{totalQuestions})
              </span>
            </p>
          </div>

          <div className="quiz-results__actions flex flex-col gap-3 max-w-sm mx-auto">
            <button
              type="button"
              className="w-full rounded-2xl bg-[#E4F6FD] px-4 py-3 text-sm font-bold text-primary transition hover:bg-[#c9eefd]"
              onClick={() => {
                setCurrentIndex(0);
                setQuizState("review");
              }}
            >
              Lösungen überprüfen
            </button>
            
            <button
              type="button"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-textMain transition hover:border-primary/45"
              onClick={() => void startFreshQuiz(testSize as QuizInitialSize)}
            >
              Neuen Test starten
            </button>

            {onRequestExit && (
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-textMain/60 underline-offset-2 transition hover:text-primary hover:underline"
                onClick={() => {
                  resetToMenu();
                  onRequestExit();
                }}
              >
                Zurück zum Dashboard
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}