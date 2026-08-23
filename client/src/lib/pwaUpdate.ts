export const PWA_UPDATE_EVENT = "servicom:pwa-update";

export type PwaRegistrationLike = ServiceWorkerRegistration & {
  waiting: ServiceWorker | null;
  installing: ServiceWorker | null;
};

export function notifyPwaUpdateAvailable() {
  window.dispatchEvent(new Event(PWA_UPDATE_EVENT));
}

export function requestPwaUpdate(registration: PwaRegistrationLike) {
  if (!registration.waiting) return false;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

export function watchPwaRegistration(registration: PwaRegistrationLike) {
  if (registration.waiting) notifyPwaUpdateAvailable();

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        notifyPwaUpdateAvailable();
      }
    });
  });

  return registration;
}

export async function registerPwaForUpdates() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return null;
  const registration = await navigator.serviceWorker.register("/service-worker.js");
  watchPwaRegistration(registration);
  const refresh = () => registration.update().catch(() => undefined);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  return registration;
}
