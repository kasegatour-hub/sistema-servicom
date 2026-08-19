export const MAX_PASSWORD_FAILURES = 5;
export const PASSWORD_LOCKOUT_SECONDS = 60;

export function getRemainingLockoutSeconds(lockedUntil: Date | null | undefined, now = Date.now()) {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((lockedUntil.getTime() - now) / 1000));
}

export function getFailureUpdate(previousAttempts: number | null | undefined, previousLock: Date | null | undefined, now = new Date()) {
  const activeLock = getRemainingLockoutSeconds(previousLock, now.getTime()) > 0;
  if (activeLock) return { attempts: previousAttempts ?? MAX_PASSWORD_FAILURES, lockedUntil: previousLock ?? null };
  const attempts = (previousAttempts ?? 0) + 1;
  return attempts >= MAX_PASSWORD_FAILURES
    ? { attempts: 0, lockedUntil: new Date(now.getTime() + PASSWORD_LOCKOUT_SECONDS * 1000) }
    : { attempts, lockedUntil: null };
}
