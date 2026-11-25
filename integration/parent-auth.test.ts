import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { POST as setup } from "@/app/api/setup/route";
import { POST as login } from "@/app/api/auth/verify-pin/route";
import { POST as reset } from "@/app/api/parent/pin-reset/route";
import { signParentToken, verifyParentToken } from "@/lib/auth";
import { signKioskChildSession, hasChildSession } from "@/lib/kiosk-session";

const session = vi.hoisted(() => ({ parent: "", kiosk: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => {
    const value = name === "parent_session" ? session.parent : name === "kiosk_child_session" ? session.kiosk : "";
    return value ? { value } : undefined;
  } }),
}));

const pin = "4826";
const wrong = "0000";
let id: string;
let originalHash: string;
let created = false;
let original: Awaited<ReturnType<typeof prisma.familyConfig.findFirst>> = null;
const auditIds: string[] = [];

function request(body: unknown) {
  return new Request("http://localhost/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
const state = () => prisma.familyConfig.findUniqueOrThrow({ where: { id } });

beforeEach(async () => {
  if (!id) {
    original = await prisma.familyConfig.findFirst();
    if (await prisma.familyConfig.count() > 1) throw new Error("Expected a singleton test config");
    if (original) id = original.id;
    else {
      id = (await prisma.familyConfig.create({ data: {} })).id;
      created = true;
    }
  }
  originalHash = await hash(pin, 4);
  await prisma.familyConfig.update({ where: { id }, data: { parentPin: originalHash, parentPinLength: 4, isConfigured: true, parentPinFailures: 0, parentPinLockedUntil: null } });
  session.parent = "";
  session.kiosk = "";
});

afterAll(async () => {
  if (id && created) await prisma.familyConfig.delete({ where: { id } });
  else if (id && original) {
    const { parentPin, parentPinLength, isConfigured, parentPinFailures, parentPinLockedUntil } = original;
    await prisma.familyConfig.update({ where: { id }, data: { parentPin, parentPinLength, isConfigured, parentPinFailures, parentPinLockedUntil } });
  }
  await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
  await prisma.$disconnect();
});

describe("PostgreSQL parent authentication", () => {
  it("allows only one concurrent first-time setup on an empty configuration", async () => {
    const saved = await state();
    await prisma.familyConfig.delete({ where: { id } });
    try {
      const responses = await Promise.all([setup(request({ pin: "1234" })), setup(request({ pin: "5678" }))]);
      expect(responses.filter(r => r.status === 200)).toHaveLength(1);
      expect(responses.filter(r => r.status === 403 || r.status === 409)).toHaveLength(1);
      expect(await prisma.familyConfig.count()).toBe(1);
      const config = await prisma.familyConfig.findFirstOrThrow();
      expect(await compare(responses[0].status === 200 ? "1234" : "5678", config.parentPin!)).toBe(true);
    } finally {
      await prisma.familyConfig.deleteMany();
      await prisma.familyConfig.create({ data: saved });
    }
  });

  it("persists five failures, blocks even the correct PIN, and resets after expiry", async () => {
    for (let i = 0; i < 5; i++) expect((await login(request({ pin: wrong }))).status).toBe(401);
    const locked = await state();
    expect(locked.parentPinFailures).toBe(5);
    expect(locked.parentPinLockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60000);
    const blocked = await login(request({ pin }));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    await prisma.familyConfig.update({ where: { id }, data: { parentPinLockedUntil: new Date(Date.now() - 1000) } });
    expect((await login(request({ pin: wrong }))).status).toBe(401);
    expect((await state()).parentPinFailures).toBe(1);
    expect((await login(request({ pin }))).status).toBe(200);
    expect(await state()).toMatchObject({ parentPinFailures: 0, parentPinLockedUntil: null });
  });

  it("prevents simultaneous requests from exceeding the failure budget", async () => {
    await prisma.familyConfig.update({ where: { id }, data: { parentPinFailures: 4 } });
    const responses = await Promise.all(Array.from({ length: 8 }, () => login(request({ pin: wrong }))));
    expect(responses.filter(r => r.status === 401)).toHaveLength(1);
    expect(responses.filter(r => r.status === 429)).toHaveLength(7);
    expect((await state()).parentPinFailures).toBe(5);
  });

  it("rejects malformed PINs and unauthenticated resets", async () => {
    expect((await login(request({ pin: "abc" }))).status).toBe(400);
    expect((await state()).parentPinFailures).toBe(0);
    expect((await reset(request({ newPin: "1234" }))).status).toBe(401);
    expect((await state()).parentPin).toBe(originalHash);
  });

  it("atomically resets the PIN and revokes old sessions while preserving kiosk access", async () => {
    const before = await prisma.auditLog.findMany({ where: { action: "RESET_PIN" }, select: { id: true } });
    session.parent = await signParentToken(originalHash);
    const other = await signParentToken(originalHash);
    session.kiosk = await signKioskChildSession("test-child");
    await prisma.familyConfig.update({ where: { id }, data: { parentPinFailures: 5, parentPinLockedUntil: new Date(Date.now() + 900000) } });
    const responses = await Promise.all([reset(request({ newPin: "1234" })), reset(request({ newPin: "1234" }))]);
    const audits = await prisma.auditLog.findMany({ where: { action: "RESET_PIN", id: { notIn: before.map(a => a.id) } } });
    auditIds.push(...audits.map(a => a.id));
    expect(responses.map(r => r.status).toSorted()).toEqual([200, 401]);
    expect(audits).toHaveLength(1);
    const saved = await state();
    expect(await compare("1234", saved.parentPin!)).toBe(true);
    expect(saved).toMatchObject({ parentPinFailures: 0, parentPinLockedUntil: null });
    await expect(verifyParentToken(session.parent)).rejects.toThrow();
    await expect(verifyParentToken(other)).rejects.toThrow();
    expect(await hasChildSession("test-child")).toBe(true);
    expect((await login(request({ pin }))).status).toBe(401);
    expect((await login(request({ pin: "1234" }))).status).toBe(200);
  });

  it("rolls back credential changes when the audit insert fails", async () => {
    session.parent = await signParentToken(originalHash);
    await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" ADD CONSTRAINT "ci_reject_pin_reset" CHECK ("action" <> \'RESET_PIN\') NOT VALID');
    try {
      expect((await reset(request({ newPin: "1234" }))).status).toBe(500);
      expect((await state()).parentPin).toBe(originalHash);
      await expect(verifyParentToken(session.parent)).resolves.toBeDefined();
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" DROP CONSTRAINT "ci_reject_pin_reset"');
    }
  });
});
