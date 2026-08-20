import { BookOpen, Crown, Zap, Lock } from "lucide-react";
import type { QuizInitialSize } from "@/components/QuizComponent";

interface DashboardTrainingSectionProps {
  isPremium?: boolean;
}

const MODES: {
  size: QuizInitialSize;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Zap;
  accentClass: string;
  iconWrapClass: string;
  isProOnly?: boolean;
}[] = [
  {
    size: 15,
    title: "Schnelltest",
    subtitle: "15 Fragen",
    description: "Ideal für eine schnelle Wiederholung zwischen Patienten.",
    icon: Zap,
    accentClass: "text-amber-600 group-hover:text-amber-700",
    iconWrapClass: "bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-100",
    isProOnly: false,
  },
  {
    size: 25,
    title: "Standardtest",
    subtitle: "25 Fragen",
    description: "Das ausgewogenste Format für dein Lernen.",
    icon: BookOpen,
    accentClass: "text-primary group-hover:text-[#3a9bc4]",
    iconWrapClass: "bg-[#E4F6FD] text-primary ring-[#C8E8F5] group-hover:bg-[#d4eef8]",
    isProOnly: true,
  },
  {
    size: 50,
    title: "Intensivsimulation",
    subtitle: "50 Fragen",
    description: "Teste deine Ausdauer und dein Gesamtwissen.",
    icon: Crown,
    accentClass: "text-violet-600 group-hover:text-violet-700",
    iconWrapClass: "bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100",
    isProOnly: true,
  },
];

export default function DashboardTrainingSection({ isPremium = false }: DashboardTrainingSectionProps) {
  return (
    <section
      id="entrenamiento"
      className={`dashboard-training mb-12 ${!isPremium ? 'scroll-mt-36' : 'scroll-mt-24'}`}
      aria-labelledby="dashboard-training-heading"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="dashboard-training-heading"
            className="text-lg font-semibold flex items-center gap-2 text-textMain uppercase tracking-widest"
          >
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8" />
              <path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8" />
              <path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5" />
              <path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0" />
              <path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5" />
              <path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10" />
            </svg>
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
            isProOnly,
          }) => {
            const isLocked = isProOnly && !isPremium;
            const targetHref = isLocked ? "/pricing" : `/entrenamiento/${size}`;

            return (
              <a
                key={size}
                href={targetHref}
                className={`dashboard-training__card group relative flex w-full flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isLocked 
                    ? "border-border/80 hover:border-amber-400/50 hover:shadow-md" 
                    : "border-border hover:border-primary/40 hover:shadow-md focus-visible:outline-primary"
                }`}
              >
                {/* Badge de Pro / Bloqueado */}
                {isLocked && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3" /> PRO
                  </span>
                )}

                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-inset transition ${
                    isLocked ? "bg-slate-100 text-slate-500 ring-slate-200 group-hover:bg-slate-200/70" : iconWrapClass
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isLocked ? "text-slate-500" : accentClass}`} strokeWidth={2} />
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-textMain/45">
                  {subtitle}
                </span>
                
                <h3 className="mt-1 text-lg font-bold text-textMain">{title}</h3>
                
                <p className="mt-2 text-sm leading-relaxed text-textMain/60">
                  {description}
                </p>

                <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold">
                  {isLocked ? (
                    <span className="text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                      Freischalten mit Pro →
                    </span>
                  ) : (
                    <span className={`${accentClass} transition`}>
                      Starten →
                    </span>
                  )}
                </div>
              </a>
            );
          }
        )}
      </div>
    </section>
  );
}