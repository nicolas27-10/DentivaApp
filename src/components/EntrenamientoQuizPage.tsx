import QuizComponent, { type QuizInitialSize } from "@/components/QuizComponent";

type EntrenamientoQuizPageProps = {
  userId: string;
  initialSize: QuizInitialSize;
  accessToken?: string; // 👈 Agregamos esta propiedad
};

export default function EntrenamientoQuizPage({
  userId,
  initialSize,
  accessToken,
}: EntrenamientoQuizPageProps) {
  return (
    <div className="training-quiz-page mx-auto w-full">
      <QuizComponent
        userId={userId}
        initialSize={initialSize}
        accessToken={accessToken}
        onRequestExit={() => {
          window.location.assign("/dashboard#entrenamiento");
        }}
      />
    </div>
  );
}