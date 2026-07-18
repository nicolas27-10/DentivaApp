import { BookOpen, Crown, Zap } from "lucide-react";
import type { QuizInitialSize } from "@/components/QuizComponent";

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
    title: "Schnelltest",
    subtitle: "15 Fragen",
    description: "Ideal für eine schnelle Wiederholung zwischen Patienten.",
    icon: Zap,
    accentClass: "text-amber-600 group-hover:text-amber-700",
    iconWrapClass:
      "bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-100",
  },
  {
    size: 25,
    title: "Standardtest",
    subtitle: "25 Fragen",
    description: "Das ausgewogenste Format für dein Lernen.",
    icon: BookOpen,
    accentClass: "text-primary group-hover:text-[#3a9bc4]",
    iconWrapClass:
      "bg-[#E4F6FD] text-primary ring-[#C8E8F5] group-hover:bg-[#d4eef8]",
  },
  {
    size: 50,
    title: "Intensivsimulation",
    subtitle: "50 Fragen",
    description: "Teste deine Ausdauer und dein Gesamtwissen.",
    icon: Crown,
    accentClass: "text-violet-600 group-hover:text-violet-700",
    iconWrapClass:
      "bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100",
  },
];

export default function DashboardTrainingSection() {
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
            Trainingszentrum
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-textMain/65">
            Tägliches Üben mit Fragen aus den Modulen, die du bereits
            abgeschlossen hast. Wähle die Intensität und starte den Prüfungsmodus.
          </p>
        </div>
      </div>

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
            <a
              key={size}
              href={`/entrenamiento/${size}`}
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
                Starten →
              </span>
            </a>
          )
        )}
      </div>
    </section>
  );
}
