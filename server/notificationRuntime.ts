export function shouldSuppressNotifications(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}
