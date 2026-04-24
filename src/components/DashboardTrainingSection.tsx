import { useState } from "react";
import { BookOpen, Crown, Zap } from "lucide-react";
import QuizComponent, { type QuizInitialSize } from "@/components/QuizComponent";

type DashboardTrainingSectionProps = {
  userId: string;
};

const MODES: {
  size: QuizInitialSize;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Zap;
  accentClass: string;
  iconWrapClass: string;
}[] = [
  {
    size: 15,
    title: "Prueba rápida",
    subtitle: "15 preguntas",
    description: "Ideal para un repaso veloz entre pacientes.",
    icon: Zap,
    accentClass: "text-amber-600 group-hover:text-amber-700",
    iconWrapClass:
      "bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-100",
  },
  {
    size: 25,
    title: "Prueba estándar",
    subtitle: "25 preguntas",
    description: "El formato más equilibrado para tu estudio.",
    icon: BookOpen,
    accentClass: "text-primary group-hover:text-[#3a9bc4]",
    iconWrapClass:
      "bg-[#E4F6FD] text-primary ring-[#C8E8F5] group-hover:bg-[#d4eef8]",
  },
  {
    size: 50,
    title: "Simulacro intensivo",
    subtitle: "50 preguntas",
    description: "Pon a prueba tu resistencia y conocimiento global.",
    icon: Crown,
    accentClass: "text-violet-600 group-hover:text-violet-700",
    iconWrapClass:
      "bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100",
  },
];

export default function DashboardTrainingSection({
  userId,
}: DashboardTrainingSectionProps) {
  const [activeQuizSize, setActiveQuizSize] = useState<QuizInitialSize | null>(
    null
  );

  return (
    <section
      id="entrenamiento"
      className="dashboard-training mb-12 scroll-mt-24"
      aria-labelledby="dashboard-training-heading"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="dashboard-training-heading"
            className="text-lg font-semibold text-textMain uppercase tracking-widest"
          >
            Centro de entrenamiento
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-textMain/65">
            Práctica diaria con preguntas adaptadas a los módulos que ya
            completaste. Elige la intensidad y entra al modo examen.
          </p>
        </div>
      </div>

      {activeQuizSize === null ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {MODES.map(
            ({
              size,
              title,
              subtitle,
              description,
              icon: Icon,
              accentClass,
              iconWrapClass,
            }) => (
              <button
                key={size}
                type="button"
                onClick={() => setActiveQuizSize(size)}
                className="dashboard-training__card group relative flex w-full flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-inset transition ${iconWrapClass}`}
                >
                  <Icon className={`h-6 w-6 ${accentClass}`} strokeWidth={2} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-textMain/45">
                  {subtitle}
                </span>
                <h3 className="mt-1 text-lg font-bold text-textMain">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textMain/60">
                  {description}
                </p>
                <span
                  className={`mt-5 text-sm font-semibold ${accentClass} transition`}
                >
                  Comenzar →
                </span>
              </button>
            )
          )}
        </div>
      ) : (
        <div className="dashboard-training__quiz rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-6 md:p-8">
          <QuizComponent
            userId={userId}
            initialSize={activeQuizSize}
            onRequestExit={() => setActiveQuizSize(null)}
          />
        </div>
      )}
    </section>
  );
}
