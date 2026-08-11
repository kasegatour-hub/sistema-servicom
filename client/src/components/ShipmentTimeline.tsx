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

const STAGES_ORDER = ["En agencia", "En tránsito", "En destino", "Entregado"];

export function ShipmentTimeline({ events, currentStatus }: ShipmentTimelineProps) {
  const currentStageIndex = STAGES_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full py-8">
      <div className="space-y-6">
        {STAGES_ORDER.map((stage, index) => {
          const isCompleted = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const stageEvents = events.filter(e => e.stage === stage);
          const event = stageEvents[stageEvents.length - 1];

          return (
            <div key={stage} className="flex gap-4">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? stage === "Entregado"
                        ? "bg-blue-600 text-white"
                        : "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                {index < STAGES_ORDER.length - 1 && (
                  <div
                    className={`w-1 h-16 my-2 transition-all ${
                      isCompleted ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-baseline gap-2">
                  <h3
                    className={`font-semibold text-lg ${
                      isCompleted ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {stage}
                  </h3>
                  {isCurrent && (
                    <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                      Actual
                    </span>
                  )}
                </div>
                {event && (
                  <>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">{event.description}</p>
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
