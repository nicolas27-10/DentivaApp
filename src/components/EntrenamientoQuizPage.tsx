import QuizComponent, { type QuizInitialSize } from "@/components/QuizComponent";

type EntrenamientoQuizPageProps = {
  userId: string;
  initialSize: QuizInitialSize;
};

export default function EntrenamientoQuizPage({
  userId,
  initialSize,
}: EntrenamientoQuizPageProps) {
  return (
    <div className="training-quiz-page mx-auto w-full max-w-3xl px-1 py-2 sm:px-0 sm:py-4">
      <QuizComponent
        userId={userId}
        initialSize={initialSize}
        onRequestExit={() => {
          window.location.assign("/dashboard#entrenamiento");
        }}
      />
    </div>
  );
}
