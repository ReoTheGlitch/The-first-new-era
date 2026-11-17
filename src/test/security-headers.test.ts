// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applySecurityHeaders, SECURITY_HEADERS } from "@/lib/security/security-headers";

describe("security headers", () => {
  it("adds every header and preserves existing ones", async () => {
    const res = applySecurityHeaders(
      new Response("hi", { status: 201, headers: { "content-type": "text/plain" } }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("text/plain");
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(k)).toBe(v);
    expect(await res.text()).toBe("hi");
  });

  it("cf-entry.mjs carries the same header values", () => {
    const src = readFileSync("scripts/cf/cf-entry.mjs", "utf8");
    for (const v of Object.values(SECURITY_HEADERS)) {
      // CSP is joined from directives in the shim; check each directive instead.
      for (const part of v.split("; ")) expect(src).toContain(part);
    }
  });
});
