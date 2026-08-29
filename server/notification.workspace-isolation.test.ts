import { describe, expect, it } from "vitest";
import { filterNotificationAdminIds, getNotificationWorkspaceAdminId } from "./db";

const ACTIVE_ADMIN_IDS = [1, 4, 90001, 210001, 210002];

describe("aislamiento de notificaciones por entorno", () => {
  it("excluye a Magdalena y Kasega de las notificaciones de Servicom", () => {
    expect(filterNotificationAdminIds(ACTIVE_ADMIN_IDS, null)).toEqual([1, 4, 90001]);
  });

  it("envía las notificaciones de Magdalena únicamente a Magdalena", () => {
    expect(getNotificationWorkspaceAdminId(210001)).toBe(210001);
    expect(filterNotificationAdminIds(ACTIVE_ADMIN_IDS, 210001)).toEqual([210001]);
  });

  it("envía las notificaciones de Kasega Tour únicamente a Kasega Tour", () => {
    expect(getNotificationWorkspaceAdminId(210002)).toBe(210002);
    expect(filterNotificationAdminIds(ACTIVE_ADMIN_IDS, 210002)).toEqual([210002]);
  });

  it("trata cualquier administrador no aislado como parte de Servicom", () => {
    expect(getNotificationWorkspaceAdminId(1)).toBeNull();
    expect(filterNotificationAdminIds(ACTIVE_ADMIN_IDS, 1)).toEqual([1, 4, 90001]);
  });
});
