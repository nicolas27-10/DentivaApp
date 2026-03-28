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
  explanation: string | null; // 👈 Aseguramos que puede ser null
  exercise_options: Option[];
}

interface QuizProps {
  exercises: Exercise[];
  userId: string;
  lessonId: string | number;
  moduleId: string | number;
}

export default function VerticalQuiz({ exercises, userId, lessonId, moduleId }: QuizProps) {
  // 🚀 1. Nombre único para guardar en la memoria del navegador
  const storageKey = `dentiva_progress_${userId}_${lessonId}`;

  // 🚀 2. Inicializamos el estado leyendo el LocalStorage (por si ya había respondido antes)
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

  // 🚀 3. Cada vez que 'answers' cambia, lo guardamos en LocalStorage automáticamente
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  // Clic en opciones (Test / V-F)
  const handleOptionClick = (exerciseId: number, optionId: number) => {
    if (answers[exerciseId]) return;
    setAnswers((prev) => ({ ...prev, [exerciseId]: optionId }));
  };

  // Clic en Flashcards
  const handleFlashcardComplete = (exerciseId: number) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: true }));
  };

  // El Gran Guardado Final
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
      
      // 🚀 4. Como ya terminó la lección con éxito, limpiamos el LocalStorage para no dejar basura
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
      
      // Redirigimos al usuario a la página del módulo
      window.location.href = `/module/${moduleId}?success=lesson_completed`;
      
    } catch (error) {
      console.error(error);
      alert("Hubo un error guardando tu progreso. Inténtalo de nuevo.");
      setIsSaving(false);
    }
  };

  const totalQuestions = exercises.length;
  const answeredCount = Object.keys(answers).length;
  // Calculamos el porcentaje para la barra de progreso
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-24 relative">
      
      {/* 🚀 5. LA BARRA DE PROGRESO (Sticky: siempre visible arriba) */}
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md p-4 border-b border-gray-100 shadow-sm mb-6 rounded-b-2xl">
        <div className="flex justify-between items-center text-sm font-bold text-gray-500 mb-2">
          <span>Progreso de la lección</span>
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
        {exercises.map((exercise, index) => {
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
                {/* Etiquetas para distinguir el tipo de ejercicio */}
                {isFlashcard && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold uppercase shrink-0">Flashcard</span>}
                {isTrueFalse && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold uppercase shrink-0">V / F</span>}
              </div>

              {/* SI ES TEST MULTIPLE CHOICE O VERDADERO/FALSO */}
              {!isFlashcard && (
                <div className="space-y-3">
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

              {/* SI ES FLASHCARD */}
              {isFlashcard && !isAnswered && (
                <button
                  onClick={() => handleFlashcardComplete(exercise.id)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-lg border-2 border-indigo-200 transition-colors"
                >
                  Girar carta / Entendido
                </button>
              )}

              {/* EXPLICACIÓN (Solo si ya respondió Y si hay explicación en la DB) */}
              {isAnswered && exercise.explanation && exercise.explanation.trim() !== '' && (
                <div className="mt-5 p-4 rounded-lg text-sm bg-blue-50 text-blue-800 border-l-4 border-blue-500">
                  <strong className="block mb-1">{isFlashcard ? 'Respuesta:' : 'Explicación:'}</strong> 
                  {exercise.explanation}
                </div>
              )}
            </div>
          );
        })}

        {/* BOTÓN FINAL */}
        {answeredCount === totalQuestions && !isFinished && (
          <div className="mt-8 mb-4">
            <button
              onClick={handleFinishLesson}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform transform hover:scale-[1.02] flex justify-center items-center"
            >
              {isSaving ? "Guardando progreso..." : "Terminar Lección 🚀"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}