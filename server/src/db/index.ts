import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";
import Database from "bun:sqlite";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./mediarr.db";

const sqlite = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
