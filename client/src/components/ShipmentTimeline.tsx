import { CheckCircle2, Clock } from "lucide-react";

export interface TimelineEvent {
  stage: string;
  date: string;
  description: string;
}

interface ShipmentTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const STAGES_ORDER = ["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"];

export function ShipmentTimeline({ events, currentStatus }: ShipmentTimelineProps) {
  const currentStageIndex = STAGES_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full py-7 sm:py-9">
      <div className="space-y-7 sm:space-y-8">
        {STAGES_ORDER.map((stage, index) => {
          const isCompleted = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const stageEvents = events.filter(e => e.stage === stage);
          const event = stageEvents[stageEvents.length - 1];

          return (
            <div key={stage} className="flex gap-4 sm:gap-5">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all sm:h-14 sm:w-14 ${
                    isCompleted
                      ? stage === "Entregado"
                        ? "bg-blue-600 text-white"
                        : "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
                  ) : (
                    <Clock className="h-7 w-7 sm:h-8 sm:w-8" />
                  )}
                </div>
                {index < STAGES_ORDER.length - 1 && (
                  <div
                      className={`my-2 h-16 w-1.5 rounded-full transition-all ${
                      isCompleted ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={`text-xl font-extrabold tracking-tight sm:text-2xl ${
                      isCompleted ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {stage}
                  </h3>
                  {isCurrent && (
                    <span className="inline-flex rounded-full bg-[#F28C00] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
                      Actual
                    </span>
                  )}
                </div>
                {event && (
                  <>
                    <p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base">
                      {new Date(event.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-2 text-base leading-7 text-slate-700 sm:text-lg">{event.description}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
