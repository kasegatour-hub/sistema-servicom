import { describe, expect, it, vi } from "vitest";
import { PWA_UPDATE_EVENT, checkPwaForUpdates, requestPwaUpdate, watchPwaRegistration, type PwaRegistrationLike } from "./pwaUpdate";

describe("PWA update flow", () => {
  it("notifies when a waiting service worker already exists", () => {
    const browserEvents = new EventTarget();
    vi.stubGlobal("window", browserEvents);
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const registration = new EventTarget() as ServiceWorkerRegistration & { waiting: ServiceWorker | null; installing: ServiceWorker | null };
    Object.defineProperty(registration, "waiting", { value: waiting, configurable: true });
    Object.defineProperty(registration, "installing", { value: null, configurable: true });
    const listener = vi.fn();
    window.addEventListener(PWA_UPDATE_EVENT, listener);

    watchPwaRegistration(registration);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PWA_UPDATE_EVENT, listener);
    vi.unstubAllGlobals();
  });

  it("asks the waiting worker to activate and reports success", () => {
    const postMessage = vi.fn();
    const registration = { waiting: { postMessage } as unknown as ServiceWorker } as ServiceWorkerRegistration & { waiting: ServiceWorker | null };

    expect(requestPwaUpdate(registration)).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("does not attempt activation when no update is waiting", () => {
    const registration = { waiting: null } as ServiceWorkerRegistration & { waiting: ServiceWorker | null };
    expect(requestPwaUpdate(registration)).toBe(false);
  });

  it("announces a waiting worker discovered by a later update check", async () => {
    const browserEvents = new EventTarget();
    vi.stubGlobal("window", browserEvents);
    const listener = vi.fn();
    window.addEventListener(PWA_UPDATE_EVENT, listener);
    const registration = { waiting: { postMessage: vi.fn() }, update: vi.fn().mockResolvedValue(undefined) } as unknown as PwaRegistrationLike;

    await checkPwaForUpdates(registration);

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PWA_UPDATE_EVENT, listener);
    vi.unstubAllGlobals();
  });
});
