import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Auth for server functions (deliberately not named *.server.ts: the middleware object is
 * referenced from client code, and the compiler strips the server-only body).
 * Reads the session cookie, loads session + user and injects
 * `{ db, userId }` into the context. Throws a 401 Response when there is no valid session.
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  // Server-only modules are loaded lazily: this file is imported by client bundles too
  // (the middleware object is shared), so it must not statically import *.server modules.
  const { getDb } = await import("@/lib/db/index.server");
  const { getSessionCookie, readSession } = await import("./session.server");
  const request = getRequest();
  const token = request ? getSessionCookie(request) : null;
  if (!token) throw unauthorized();
  const db = getDb();
  const session = await readSession(db, token);
  if (!session) throw unauthorized();
  return next({ context: { db, userId: session.userId } });
});
