import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const DB_FILE = path.resolve(process.env.DB_PATH || "./db/database.db");
const db = new sqlite3.Database(DB_FILE);

export default {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  close() {
    return new Promise((resolve) => db.close(resolve));
  }
};
