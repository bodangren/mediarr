import { createRequire } from "node:module";
import * as schema from "./schema.js";
const require = createRequire(import.meta.url);
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./mediarr.db";

let sqlite: any;
let db: any;
try {
  const bunSqlite = require("bun:sqlite");
  const { drizzle: drizzleBun } = require("drizzle-orm/bun-sqlite");
  const BunDatabase = bunSqlite.default ?? bunSqlite.Database ?? bunSqlite;
  sqlite = new BunDatabase(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  db = drizzleBun(sqlite, { schema });
} catch {
  const { drizzle: drizzleBetterSqlite } = require("drizzle-orm/better-sqlite3");
  const BetterSqlite3 = require("better-sqlite3");
  sqlite = new BetterSqlite3(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  db = drizzleBetterSqlite(sqlite, { schema });
}

export { db };
export type DB = typeof db;
