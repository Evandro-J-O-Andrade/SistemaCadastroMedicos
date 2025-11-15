import { open } from "sqlite";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DB_FILE = process.env.DB_PATH || "./db/database.db";

async function main() {
  console.log("⚠️ Migrate helper: use db/init.js + db/seed.js para setup inicial.");
}

main().catch(console.error);
