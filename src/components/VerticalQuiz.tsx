import React, { useState, useEffect } from 'react';

interface Option {
  id: number;
  option_text: string;
  is_correct: boolean;
}

interface Exercise {
  id: number;
  type: string; 
  question_text: string;
  explanation: string | null;
  exercise_options: Option[];
}

interface QuizProps {
  exercises: Exercise[];
  userId: string;
  lessonId: string | number;
  moduleId: string | number;
}

export default function VerticalQuiz({ exercises, userId, lessonId, moduleId }: QuizProps) {
  const [shuffledExercises, setShuffledExercises] = useState<Exercise[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const storageKey = `dentiva_progress_${userId}_${lessonId}`;

  const [answers, setAnswers] = useState<Record<number, number | boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error leyendo el progreso guardado", e);
        }
      }
    }
    return {};
  });

  // 🔒 BLOQUEO DE SCROLL PROFESIONAL
  // Este efecto vigila 'isSaving'. Si es true, congela el scroll.
  useEffect(() => {
    if (isSaving) {
      document.body.style.overflow = 'hidden';
      // Opcional: añade un padding-right para evitar que la página "salte" al desaparecer la scrollbar
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)'; 
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0px';
    }

    // Limpieza (Cleanup): Si el usuario cierra la pestaña o navega, devolvemos el scroll
    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0px';
    };
  }, [isSaving]);

  useEffect(() => {
    const randomized = exercises.map(exercise => {
      if (exercise.type === 'flashcard') return exercise; 
      return {
        ...exercise,
        exercise_options: [...exercise.exercise_options].sort(() => Math.random() - 0.5)
      };
    });
    setShuffledExercises(randomized);
    setIsMounted(true);
  }, [exercises]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  const handleOptionClick = (exerciseId: number, optionId: number) => {
    if (answers[exerciseId]) return;
    setAnswers((prev) => ({ ...prev, [exerciseId]: optionId }));
  };

  const handleFlashcardComplete = (exerciseId: number) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: true }));
  };

  const handleFinishLesson = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lessonId, answers }),
      });

      if (!response.ok) throw new Error("Error al guardar");

      setIsFinished(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      window.location.href = `/module/${moduleId}?success=lesson_completed`;
      
    } catch (error) {
      console.error(error);
      alert("Beim Speichern Ihres Spielfortschritts ist ein Fehler opgetreten.");
      setIsSaving(false); // Al ponerlo en false, el useEffect de arriba reactiva el scroll solo
    }
  };

  if (!isMounted) return null;

  const totalQuestions = shuffledExercises.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="mx-auto pb-24 relative min-h-[400px]">
      
      {/* 🌀 PANTALLA DE CARGA (Fixed + Blur + No Scroll) */}
      {isSaving && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-md z-50 flex flex-col items-center justify-center pointer-events-auto">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-[#E4F6FD] rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#2B8EB5] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-[#2B8EB5] font-bold text-sm tracking-wide animate-pulse uppercase">
            Fortschritt speichern...
          </p>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md p-4 border-b border-gray-100 shadow-sm mb-6 rounded-b-2xl">
        <div className="flex justify-between items-center text-sm font-bold text-gray-500 mb-2">
          <span>Unterrichtsfortschritt</span>
          <span className="text-primary">{answeredCount} / {totalQuestions} ({progressPercentage}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
        </div>
      </div>

      <div className="px-4 space-y-8">
        {shuffledExercises.map((exercise, index) => {
          const selectedAnswer = answers[exercise.id];
          const isAnswered = selectedAnswer !== undefined;
          
          return (
            <div key={exercise.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4 gap-4">
                <h3 className="font-bold text-lg text-gray-800 leading-snug">{index + 1}. {exercise.question_text}</h3>
              </div>

              {exercise.type !== 'flashcard' && (
                <div className="space-y-3">
                  {exercise.exercise_options.map((option) => {
                    const isSelected = selectedAnswer === option.id;
                    let buttonColor = "bg-gray-50 border-gray-200 text-gray-700";
                    if (isAnswered) {
                      if (option.is_correct) buttonColor = "bg-green-100 border-green-500 text-green-800";
                      else if (isSelected) buttonColor = "bg-red-100 border-red-500 text-red-800";
                      else buttonColor = "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                    }
                    return (
                      <button key={option.id} onClick={() => handleOptionClick(exercise.id, option.id)} disabled={isAnswered} className={`w-full text-left p-4 rounded-lg border-2 transition-all font-medium ${buttonColor}`}>
                        {option.option_text}
                      </button>
                    );
                  })}
                </div>
              )}

              {exercise.type === 'flashcard' && !isAnswered && (
                <button onClick={() => handleFlashcardComplete(exercise.id)} className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-lg border-2 border-indigo-200">Girar carta / Entendido</button>
              )}

              {isAnswered && exercise.explanation && (
                <div className="mt-5 p-4 rounded-lg text-sm bg-blue-50 text-blue-800 border-l-4 border-blue-500">
                  <strong className="block mb-1">Erläuterung:</strong> {exercise.explanation}
                </div>
              )}
            </div>
          );
        })}

        {answeredCount === totalQuestions && !isFinished && (
          <div className="mt-8 mb-4">
            <button
              onClick={handleFinishLesson}
              disabled={isSaving}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center disabled:opacity-70"
            >
              {isSaving ? "Fortschritt wird gespeichert…" : " Lektion abschließen 🚀"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}