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
    <div className="training-quiz-page mx-auto w-full">
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
