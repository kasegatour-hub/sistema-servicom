import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serviceWorkerSource = readFileSync(resolve(process.cwd(), "client/public/service-worker.js"), "utf8");

describe("service worker móvil", () => {
  it("no intercepta las llamadas de la API ni devuelve la aplicación para una consulta tRPC", () => {
    expect(serviceWorkerSource).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorkerSource).toContain('event.request.mode !== "navigate"');
  });

  it("renueva y limpia la caché para sustituir la versión que podía responder HTML", () => {
    expect(serviceWorkerSource).toContain('const CACHE_NAME = "servicom-mobile-v2"');
    expect(serviceWorkerSource).toContain("caches.delete(key)");
  });
});
