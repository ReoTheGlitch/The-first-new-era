/* eslint-disable @typescript-eslint/no-explicit-any */
// Database access for server code. One D1-shaped interface, two backends:
//   - Cloudflare Worker: the `DB` D1 binding, exposed by scripts/cf/cf-entry.mjs as globalThis.__CF_ENV__.DB
//   - Node (vite dev, vitest, scripts): better-sqlite3 over .data/dev.db, migrations applied on first use
//
// Only import this from *.server.ts modules or dynamically inside server function handlers.

export interface DbRunResult {
  meta: { changes: number; last_row_id?: number | null };
}

export interface DbBound {
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<DbRunResult>;
}

export interface Db {
  prepare(sql: string): { bind(...args: unknown[]): DbBound };
  batch(stmts: unknown[]): Promise<any[]>;
  exec(sql: string): Promise<void>;
}

let cached: Db | undefined;

export function getDb(): Db {
  const bound = (globalThis as any).__CF_ENV__?.DB;
  if (bound) return bound as Db;
  // Not inside the Worker (or no binding): fall back to local SQLite.
  cached ??= createNodeDb();
  return cached;
}

/** Test helper: point the Node backend at a specific file (or ":memory:") and reset the cache. */
export function resetNodeDbForTests(file?: string): Db {
  cached = createNodeDb(file);
  return cached;
}

// ---------------------------------------------------------------------------
// Node backend (better-sqlite3). Everything Node-specific is loaded lazily through
// non-literal specifiers so the Worker bundle never tries to resolve it.
// ---------------------------------------------------------------------------

type Native = { db: any; ready: Promise<any> };

function checkBindable(args: unknown[]): unknown[] {
  // Mimic D1: no undefined, no booleans. Catching these in dev avoids prod-only failures.
  return args.map((a, i) => {
    if (a === undefined) throw new Error(`D1 bind: argument ${i} is undefined (use null)`);
    if (typeof a === "boolean") throw new Error(`D1 bind: argument ${i} is a boolean (use 1 or 0)`);
    return a;
  });
}

function createNodeDb(file?: string): Db {
  const native: Native = { db: null, ready: null as any };
  const lazyImport = (spec: string): Promise<any> => import(/* @vite-ignore */ spec);

  async function open() {
    const [{ default: Database }, fs, path] = await Promise.all([
      lazyImport("better-sqlite3"),
      lazyImport("node:fs"),
      lazyImport("node:path"),
    ]);
    const target =
      file ?? process.env["DEV_DB_PATH"] ?? path.join(process.cwd(), ".data", "dev.db");
    if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
    const db = new Database(target);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Apply migrations (idempotent, tracked in _migrations).
    db.exec(
      "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    );
    const dir = path.join(process.cwd(), "migrations");
    const files: string[] = fs
      .readdirSync(dir)
      .filter((f: string) => f.endsWith(".sql"))
      .sort();
    const done = new Set(
      db
        .prepare("SELECT id FROM _migrations")
        .all()
        .map((r: any) => r.id),
    );
    for (const f of files) {
      const id = f.replace(/\.sql$/, "");
      if (done.has(id)) continue;
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT OR IGNORE INTO _migrations (id) VALUES (?)").run(id);
      })();
    }
    native.db = db;
    return db;
  }

  const getNative = () => (native.ready ??= open());

  class Bound implements DbBound {
    constructor(
      readonly sql: string,
      readonly args: unknown[],
    ) {}
    async first<T = any>(): Promise<T | null> {
      const db = await getNative();
      return (db.prepare(this.sql).get(...this.args) as T | undefined) ?? null;
    }
    async all<T = any>(): Promise<{ results: T[] }> {
      const db = await getNative();
      return { results: db.prepare(this.sql).all(...this.args) as T[] };
    }
    async run(): Promise<DbRunResult> {
      const db = await getNative();
      return runOn(db, this);
    }
  }

  function runOn(db: any, b: Bound): DbRunResult {
    const stmt = db.prepare(b.sql);
    if (stmt.reader) {
      // e.g. INSERT ... RETURNING: execute it and discard rows
      stmt.all(...b.args);
      return { meta: { changes: 0, last_row_id: null } };
    }
    const info = stmt.run(...b.args);
    return { meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
  }

  return {
    prepare(sql: string) {
      return { bind: (...args: unknown[]) => new Bound(sql, checkBindable(args)) };
    },
    async batch(stmts: unknown[]) {
      const db = await getNative();
      const list = stmts as Bound[];
      return db.transaction(() =>
        list.map((b) => {
          const stmt = db.prepare(b.sql);
          if (stmt.reader) return { results: stmt.all(...b.args), meta: { changes: 0 } };
          const info = stmt.run(...b.args);
          return {
            results: [],
            meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
          };
        }),
      )();
    },
    async exec(sql: string) {
      const db = await getNative();
      db.exec(sql);
    },
  };
}
