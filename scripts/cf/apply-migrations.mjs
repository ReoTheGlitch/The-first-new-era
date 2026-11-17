#!/usr/bin/env node
// Applies migrations/*.sql, in filename order, to the remote Cloudflare D1 database via the REST API.
// Applied migration ids are recorded in `_migrations`, so re-running is safe.
//
//   node scripts/cf/apply-migrations.mjs            # apply pending migrations, then print tables
//   node scripts/cf/apply-migrations.mjs --verify   # only print tables + applied ids
//
// Env: CLOUDFLARE_API_TOKEN (default "proxy-injected" in the cloud session),
//      CF_ACCOUNT_ID / CF_D1_ID to override the defaults below.
//
// Note on foreign keys: D1 enforces them always; local SQLite enables them in src/lib/db (runner).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 (needed in the cloud container).
if (
  isMain &&
  (process.env.HTTPS_PROXY || process.env.https_proxy) &&
  !process.env.NODE_USE_ENV_PROXY
) {
  const r = spawnSync(process.execPath, [process.argv[1], ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
  });
  process.exit(r.status ?? 1);
}

const ACCOUNT = process.env.CF_ACCOUNT_ID || "15c5b3be6ca473052a3636a3a2ce21da";
const DB_ID = process.env.CF_D1_ID || "b8c72bd3-1dc5-44a7-89d5-c7ca261797b7";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "proxy-injected";
const URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`;
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

/** Split SQL on `;` outside quotes ('..', "..", `..`) and comments (-- and slash-star). */
export function splitStatements(sql) {
  const out = [];
  let cur = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === "-" && n === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function query(sql, params) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(params ? { sql, params } : { sql }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) return body.result?.[0]?.results ?? [];
    if (attempt < 3 && (res.status >= 500 || res.status === 429)) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      continue;
    }
    throw new Error(
      `D1 error ${res.status}: ${JSON.stringify(body.errors ?? body)}\n  SQL: ${sql.slice(0, 200)}`,
    );
  }
}

async function tables() {
  const rows = await query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  return rows.map((r) => r.name);
}

async function main() {
  const verifyOnly = process.argv.includes("--verify");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!verifyOnly) {
    await query(
      "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    );
    const done = new Set((await query("SELECT id FROM _migrations")).map((r) => r.id));
    for (const file of files) {
      const id = file.replace(/\.sql$/, "");
      if (done.has(id)) {
        console.log(`skip   ${file}`);
        continue;
      }
      const statements = splitStatements(readFileSync(path.join(dir, file), "utf8"));
      process.stdout.write(`apply  ${file} (${statements.length} statements) ... `);
      for (const stmt of statements) await query(stmt);
      await query("INSERT OR IGNORE INTO _migrations (id) VALUES (?)", [id]);
      console.log("ok");
    }
  }

  const list = await tables();
  console.log(`\nTables (${list.length}):`);
  for (const t of list) console.log("  " + t);
  const applied = list.includes("_migrations")
    ? (await query("SELECT id FROM _migrations ORDER BY id")).map((r) => r.id)
    : [];
  console.log(`\n_migrations (${applied.length}): ${applied.join(", ")}`);
  const expected = files.map((f) => f.replace(/\.sql$/, ""));
  const missing = expected.filter((e) => !applied.includes(e));
  if (missing.length) {
    console.error("Missing from _migrations:", missing.join(", "));
    process.exit(1);
  }
}

if (isMain) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
