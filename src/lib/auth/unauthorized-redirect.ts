import { createMiddleware } from "@tanstack/react-start";

/**
 * Global client middleware: when a server function answers 401 (requireAuth), the session is gone,
 * so send the browser to /auth instead of handing a raw Response to the caller.
 * Registered in src/start.ts.
 */
export const redirectOnUnauthorized = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const out = await next();
    const raw = (out as { result?: unknown }).result;
    if (raw instanceof Response && raw.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/auth")
        window.location.assign("/auth");
      throw new Error("Unauthorized");
    }
    return out;
  },
);
