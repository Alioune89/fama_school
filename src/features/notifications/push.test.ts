import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: string[] = [];
const deleted: string[] = [];
const failures = new Map<string, number>();

vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (subscription: { endpoint: string }) => {
      const status = failures.get(subscription.endpoint);
      if (status) throw Object.assign(new Error(`HTTP ${status}`), { statusCode: status });
      sent.push(subscription.endpoint);
    }),
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: [
            { id: "1", endpoint: "https://push.test/actif", p256dh: "k", auth: "a" },
            { id: "2", endpoint: "https://push.test/desinstalle", p256dh: "k", auth: "a" },
          ],
          error: null,
        }),
      }),
      delete: () => ({ eq: async (_: string, id: string) => void deleted.push(id) }),
    }),
  }),
}));

const { sendPush } = await import("./push");
const payload = { title: "Bulletin", body: "Disponible", url: "/parent", tag: "t" };

describe("envoi push", () => {
  beforeEach(() => {
    sent.length = 0;
    deleted.length = 0;
    failures.clear();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public";
    process.env.VAPID_PRIVATE_KEY = "private";
  });

  it("envoie à chaque appareil du compte et retire un appareil désabonné (410)", async () => {
    failures.set("https://push.test/desinstalle", 410);
    const result = await sendPush("parent", payload);
    expect(result).toEqual({ ok: true, providerId: "PUSH-1/2" });
    expect(sent).toEqual(["https://push.test/actif"]);
    expect(deleted).toEqual(["2"]);
  });

  it("signale un échec quand aucun appareil n'a reçu l'alerte, pour un nouvel essai", async () => {
    failures.set("https://push.test/actif", 503);
    failures.set("https://push.test/desinstalle", 503);
    const result = await sendPush("parent", payload);
    expect(result.ok).toBe(false);
    expect(deleted).toEqual([]);
  });
});
