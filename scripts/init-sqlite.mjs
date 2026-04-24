import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const prismaDir = path.join(process.cwd(), "prisma");
const dbPath = path.join(prismaDir, "dev.db");
const migrationPath = path.join(
  prismaDir,
  "migrations",
  "20260423210000_init",
  "migration.sql",
);

fs.mkdirSync(prismaDir, { recursive: true });

const sql = fs.readFileSync(migrationPath, "utf8");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.exec(sql);
db.close();

console.log(`Initialized SQLite database at ${dbPath}`);
