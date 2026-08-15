export type AnalyticsEvent = {
  eventName: string;
  surface: string;
  actorType: string;
  actorId?: number | null;
  sessionKeyHash?: string | null;
  createdAt: Date | string;
  metadata?: string | null;
};

export type InteractionInsights = {
  windowDays: number;
  totalEvents: number;
  uniqueSessions: number;
  engagementScore: number;
  completionRate: number;
  anomalyScore: number;
  topEvents: Array<{ eventName: string; count: number; share: number }>;
  insights: string[];
};

/**
 * Modelo de scoring explicable para la primera versión de analítica de interacción.
 * Usa ponderación por recencia, embudo de eventos y detección robusta de picos; no
 * inspecciona nombres, DNI, teléfonos, códigos ni texto libre de formularios.
 */
export function deriveInteractionInsights(events: AnalyticsEvent[], windowDays = 30): InteractionInsights {
  const safeEvents = events.filter(event => event && event.eventName && event.surface);
  const counts = new Map<string, number>();
  const sessions = new Set<string>();
  let recencyWeightedEvents = 0;

  for (const event of safeEvents) {
    counts.set(event.eventName, (counts.get(event.eventName) || 0) + 1);
    const sessionIdentity = event.sessionKeyHash || `${event.actorType}:${event.actorId ?? "anonymous"}`;
    sessions.add(sessionIdentity);
    const timestamp = new Date(event.createdAt).getTime();
    const ageDays = Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 86_400_000) : windowDays;
    recencyWeightedEvents += Math.exp(-ageDays / 14);
  }

  const totalEvents = safeEvents.length;
  const uniqueSessions = sessions.size;
  const starts = (counts.get("shipment_create_started") || 0) + (counts.get("tracking_search_started") || 0) + (counts.get("signature_started") || 0);
  const completions = (counts.get("shipment_create_completed") || 0) + (counts.get("tracking_search_completed") || 0) + (counts.get("signature_completed") || 0);
  const completionRate = starts > 0 ? Math.min(1, completions / starts) : 0;
  const engagementScore = Math.round(Math.min(100, recencyWeightedEvents * 8 + uniqueSessions * 4 + completionRate * 40));

  const dailyCounts = new Map<string, number>();
  for (const event of safeEvents) {
    const date = new Date(event.createdAt);
    const day = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "unknown";
    dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  }
  const dailyValues = Array.from(dailyCounts.values());
  const mean = dailyValues.length ? dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length : 0;
  const variance = dailyValues.length ? dailyValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / dailyValues.length : 0;
  const standardDeviation = Math.sqrt(variance);
  const latestDay = dailyValues.at(-1) || 0;
  const anomalyScore = Math.round(Math.min(100, standardDeviation > 0 ? Math.max(0, ((latestDay - mean) / standardDeviation) * 25) : 0));

  const topEvents = Array.from(counts.entries())
    .sort(([, left], [, right]) => right - left)
    .slice(0, 6)
    .map(([eventName, count]) => ({ eventName, count, share: totalEvents ? Number((count / totalEvents).toFixed(3)) : 0 }));

  const insights: string[] = [];
  if (!totalEvents) insights.push("Aún no hay suficientes interacciones para generar un patrón de uso.");
  else if (completionRate < 0.35 && starts >= 3) insights.push("Se observa abandono en el embudo de acciones; conviene revisar los campos y mensajes antes de confirmar.");
  else if (completionRate >= 0.75) insights.push("La mayoría de las acciones iniciadas llegan a confirmarse; el flujo principal muestra buena continuidad.");
  if (uniqueSessions > 0 && totalEvents / uniqueSessions >= 8) insights.push("Las sesiones activas realizan varias acciones; prioriza accesos rápidos a rastreo, recibos y restauración.");
  if (anomalyScore >= 50) insights.push("La actividad reciente presenta un pico atípico frente al promedio del periodo; revisa la operación y el tráfico.");
  if (!insights.length) insights.push("El patrón actual es estable; continúa recopilando eventos para mejorar la precisión del análisis.");

  return { windowDays, totalEvents, uniqueSessions, engagementScore, completionRate: Number(completionRate.toFixed(3)), anomalyScore, topEvents, insights };
}
