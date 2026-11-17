// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { resetNodeDbForTests, type Db } from "@/lib/db/index.server";
import { checkAndIncrement, clientIp } from "@/lib/security/rate-limit.server";

let db: Db;
beforeAll(() => {
  db = resetNodeDbForTests(":memory:");
});

describe("rate limiter", () => {
  const W = 3_600_000;
  const t0 = 10 * W + 1000; // 1s into a window

  it("allows up to the limit, blocks after, and resets at the window boundary", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkAndIncrement(db, "t", "1.2.3.4", 3, W, t0);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(2 - i);
    }
    const blocked = await checkAndIncrement(db, "t", "1.2.3.4", 3, W, t0 + 5000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBe((W - 6000) / 1000);
    // Different key is independent.
    expect((await checkAndIncrement(db, "t", "9.9.9.9", 3, W, t0)).allowed).toBe(true);
    // Next window starts fresh.
    const next = await checkAndIncrement(db, "t", "1.2.3.4", 3, W, 11 * W);
    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(2);
  });

  it("clientIp prefers CF header and validates", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "cf-connecting-ip": "evil'; --" }))).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
