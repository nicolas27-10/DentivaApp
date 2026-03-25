import React, { useState } from 'react';

interface Option {
  id: number;
  option_text: string;
  is_correct: boolean;
}

interface Exercise {
  id: number;
  type: string; 
  question_text: string;
  explanation: string;
  exercise_options: Option[];
}

interface QuizProps {
  exercises: Exercise[];
  userId: string;
  lessonId: string | number;
  moduleId: string | number; // 👈 Agregamos el moduleId aquí
}

// 👈 Nos aseguramos de recibir moduleId en los parámetros del componente
export default function VerticalQuiz({ exercises, userId, lessonId, moduleId }: QuizProps) {
  // Guardamos las respuestas (opción elegida) o un 'true' si es una flashcard completada
  const [answers, setAnswers] = useState<Record<number, number | boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Clic en opciones (Test)
  const handleOptionClick = (exerciseId: number, optionId: number) => {
    if (answers[exerciseId]) return;
    setAnswers((prev) => ({ ...prev, [exerciseId]: optionId }));
  };

  // Clic en Flashcards
  const handleFlashcardComplete = (exerciseId: number) => {
    setAnswers((prev) => ({ ...prev, [exerciseId]: true }));
  };

  // 🚀 El Gran Guardado Final
  const handleFinishLesson = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId,
          answers // Mandamos todo de golpe
        }),
      });

      if (!response.ok) throw new Error("Error al guardar");

      setIsFinished(true);
      
      // 🚀 ¡MAGIA UX! Redirigimos al usuario a la página del módulo para continuar
      window.location.href = `/module/${moduleId}?success=lesson_completed`;
      
    } catch (error) {
      console.error(error);
      alert("Hubo un error guardando tu progreso. Inténtalo de nuevo.");
      setIsSaving(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exercises.length;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8 pb-24">
      {exercises.map((exercise, index) => {
        const selectedAnswer = answers[exercise.id];
        const isAnswered = selectedAnswer !== undefined;
        const isFlashcard = exercise.type === 'flashcard'; // Validamos si es flashcard

        return (
          <div key={exercise.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-800">
                {index + 1}. {exercise.question_text}
              </h3>
              {isFlashcard && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold uppercase">Flashcard</span>}
            </div>

            {/* SI ES TEST MULTIPLE CHOICE */}
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
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${buttonColor}`}
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

            {/* EXPLICACIÓN COMÚN (Se muestra al responder el test o al girar la flashcard) */}
            {isAnswered && (
              <div className={`mt-4 p-4 rounded-lg text-sm bg-blue-50 text-blue-800 border-l-4 border-blue-500`}>
                <strong>{isFlashcard ? 'Respuesta:' : 'Explicación:'}</strong> {exercise.explanation}
              </div>
            )}
          </div>
        );
      })}

      {/* BOTÓN FINAL */}
      {answeredCount === totalQuestions && !isFinished && (
        <div className="sticky bottom-4 w-full mt-8">
          <button
            onClick={handleFinishLesson}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform transform hover:scale-[1.02] flex justify-center items-center"
          >
            {isSaving ? "Guardando progreso..." : "Terminar Lección 🚀"}
          </button>
        </div>
      )}
    </div>
  );
}