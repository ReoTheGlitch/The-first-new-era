import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getDb } from "@/lib/db/index.server";
import { getSessionCookie, readSession } from "./session.server";

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Auth for server functions. Reads the session cookie, loads session + user and injects
 * `{ db, userId }` into the context. Throws a 401 Response when there is no valid session.
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const token = request ? getSessionCookie(request) : null;
  if (!token) throw unauthorized();
  const db = getDb();
  const session = await readSession(db, token);
  if (!session) throw unauthorized();
  return next({ context: { db, userId: session.userId } });
});
