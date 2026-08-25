import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databasePath = join(__dirname, "..", "luong.db");

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    meso_hour REAL NOT NULL DEFAULT 7000000,
    hourly_rate REAL NOT NULL DEFAULT 22000
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    work_date TEXT NOT NULL,
    shift TEXT NOT NULL,

    meso_start REAL NOT NULL,
    meso_end REAL NOT NULL,

    pot_start REAL NOT NULL DEFAULT 0,
    pot_end REAL NOT NULL DEFAULT 0,
    pot_price REAL NOT NULL DEFAULT 0,

    pink_pot_start REAL NOT NULL DEFAULT 0,
    pink_pot_end REAL NOT NULL DEFAULT 0,
    pink_pot_price REAL NOT NULL DEFAULT 0,

    purple_pot_start REAL NOT NULL DEFAULT 0,
    purple_pot_end REAL NOT NULL DEFAULT 0,
    purple_pot_price REAL NOT NULL DEFAULT 0,

    meso_hour REAL NOT NULL,
    hourly_rate REAL NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    paid_at TEXT,
    FOREIGN KEY (employee_id)
      REFERENCES employees(id)
  );
`);

function addColumnIfMissing(columnName, columnDefinition) {
  const columns = db.prepare("PRAGMA table_info(logs)").all();

  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`
      ALTER TABLE logs
      ADD COLUMN ${columnName} ${columnDefinition}
    `);

    console.log(`Đã thêm cột: ${columnName}`);
  }
}

// Tự cập nhật database cũ để thêm Pot hồng.
addColumnIfMissing("pink_pot_start", "REAL NOT NULL DEFAULT 0");

addColumnIfMissing("pink_pot_end", "REAL NOT NULL DEFAULT 0");

addColumnIfMissing("pink_pot_price", "REAL NOT NULL DEFAULT 0");

// Tự cập nhật database cũ để thêm Pot tím.
addColumnIfMissing("purple_pot_start", "REAL NOT NULL DEFAULT 0");

addColumnIfMissing("purple_pot_end", "REAL NOT NULL DEFAULT 0");

addColumnIfMissing("purple_pot_price", "REAL NOT NULL DEFAULT 0");
addColumnIfMissing("is_paid", "INTEGER NOT NULL DEFAULT 0");

addColumnIfMissing("paid_at", "TEXT");
export default db;
