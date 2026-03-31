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
  // 🚀 1. Estado para guardar los ejercicios ya mezclados
  const [shuffledExercises, setShuffledExercises] = useState<Exercise[]>([]);
  const [isMounted, setIsMounted] = useState(false); // Para evitar problemas de carga

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

  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // 🚀 2. BARAJAR OPCIONES UNA SOLA VEZ AL INICIO
  useEffect(() => {
    // Mezclamos las opciones de cada ejercicio
    const randomized = exercises.map(exercise => {
      // Si es flashcard no hay opciones que mezclar
      if (exercise.type === 'flashcard') return exercise; 
      
      return {
        ...exercise,
        // Usamos sort con Math.random() para desordenar el arreglo de opciones
        exercise_options: [...exercise.exercise_options].sort(() => Math.random() - 0.5)
      };
    });

    setShuffledExercises(randomized);
    setIsMounted(true); // Ya podemos mostrar la UI
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
        body: JSON.stringify({
          userId,
          lessonId,
          answers 
        }),
      });

      if (!response.ok) throw new Error("Error al guardar");

      setIsFinished(true);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      
      window.location.href = `/module/${moduleId}?success=lesson_completed`;
      
    } catch (error) {
      console.error(error);
      alert("Beim Speichern Ihres Spielfortschritts ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
      setIsSaving(false);
    }
  };

  // 🚀 3. Evitamos renderizar hasta que las preguntas estén mezcladas 
  // (Esto evita un parpadeo o error de hidratación en Astro)
  if (!isMounted) return null;

  // 🚀 4. Ahora usamos 'shuffledExercises' en lugar del 'exercises' original
  const totalQuestions = shuffledExercises.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className=" mx-auto pb-24 relative">
      
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md p-4 border-b border-gray-100 shadow-sm mb-6 rounded-b-2xl">
        <div className="flex justify-between items-center text-sm font-bold text-gray-500 mb-2">
          <span>Unterrichtsfortschritt</span>
          <span className="text-primary">{answeredCount} / {totalQuestions} ({progressPercentage}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="px-4 space-y-8">
        {shuffledExercises.map((exercise, index) => {
          const selectedAnswer = answers[exercise.id];
          const isAnswered = selectedAnswer !== undefined;
          const isFlashcard = exercise.type === 'flashcard';
          const isTrueFalse = exercise.type === 'true_false';

          return (
            <div key={exercise.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4 gap-4">
                <h3 className="font-bold text-lg text-gray-800 leading-snug">
                  {index + 1}. {exercise.question_text}
                </h3>
                {isFlashcard && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold uppercase shrink-0">Flashcard</span>}
                {isTrueFalse && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold uppercase shrink-0">R / F</span>}
              </div>

              {!isFlashcard && (
                <div className="space-y-3">
                  {/* Aquí renderizamos las opciones que ya están barajadas */}
                  {exercise.exercise_options.map((option) => {
                    const isSelected = selectedAnswer === option.id;
                    let buttonColor = "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700";
                    
                    if (isAnswered) {
                      if (option.is_correct) {
                        buttonColor = "bg-green-100 border-green-500 text-green-800";
                      } else if (isSelected && !option.is_correct) {
                        buttonColor = "bg-red-100 border-red-500 text-red-800";
                      } else {
                        buttonColor = "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                      }
                    }

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(exercise.id, option.id)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 font-medium ${buttonColor}`}
                      >
                        {option.option_text}
                      </button>
                    );
                  })}
                </div>
              )}

              {isFlashcard && !isAnswered && (
                <button
                  onClick={() => handleFlashcardComplete(exercise.id)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-lg border-2 border-indigo-200 transition-colors"
                >
                  Girar carta / Entendido
                </button>
              )}

              {isAnswered && exercise.explanation && exercise.explanation.trim() !== '' && (
                <div className="mt-5 p-4 rounded-lg text-sm bg-blue-50 text-blue-800 border-l-4 border-blue-500">
                  <strong className="block mb-1">{isFlashcard ? 'Antwort:' : 'Erläuterung:'}</strong> 
                  {exercise.explanation}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform transform hover:scale-[1.01] flex justify-center items-center"
            >
              {isSaving ? "Fortschritt wird gespeichert…" : " Lektion abschließen 🚀"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}