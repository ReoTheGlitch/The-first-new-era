import worker from "./index.mjs";

const TYPES = {
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  html: "text/html; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ico: "image/x-icon",
  webp: "image/webp",
  avif: "image/avif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml",
  webmanifest: "application/manifest+json",
  map: "application/json",
  wasm: "application/wasm",
};

function contentTypeFor(key) {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}

function cacheControlFor(key) {
  if (key === "sw.js" || key === "manifest.json") return "no-cache";
  if (key.startsWith("assets/") || key.startsWith("_build/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

async function serveStatic(request, kv) {
  if (!kv) return new Response("Not Found", { status: 404 });
  let key;
  try {
    key = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  if (!key || key.endsWith("/")) key += "index.html";
  const body = await kv.get(key, { type: "arrayBuffer" });
  if (body === null) return new Response("Not Found", { status: 404 });
  const headers = new Headers({
    "content-type": contentTypeFor(key),
    "cache-control": cacheControlFor(key),
  });
  if (request.method === "HEAD") return new Response(null, { headers });
  return new Response(body, { headers });
}

// Keep in sync with src/lib/security/security-headers.ts (this file is copied verbatim into the
// Worker bundle by deploy.sh, so it cannot import TypeScript; src/test/security-headers.test.ts
// fails if the two drift).
const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  "x-dns-prefetch-control": "on",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://openrouter.ai",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

function applySecurityHeaders(response) {
  if (response.status === 101) return response; // websocket upgrade
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const bound = Object.assign(Object.create(null), env, {
      ASSETS: { fetch: (req) => serveStatic(req, env.STATIC_KV) },
    });
    // App code reads bindings (DB, AI, STATIC_KV) through this global.
    globalThis.__CF_ENV__ = bound;
    return applySecurityHeaders(await worker.fetch(request, bound, ctx));
  },
};
