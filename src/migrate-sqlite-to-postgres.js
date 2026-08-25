import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlitePath = join(__dirname, "..", "luong.db");

const sqliteDb = new Database(sqlitePath, {
  readonly: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Thiếu DATABASE_URL. Kiểm tra file backend/.env",
  );
}

const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createPostgresTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      meso_hour DOUBLE PRECISION NOT NULL DEFAULT 7000000,
      hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 22000
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY,

      employee_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      shift TEXT NOT NULL,

      meso_start DOUBLE PRECISION NOT NULL,
      meso_end DOUBLE PRECISION NOT NULL,

      pot_start DOUBLE PRECISION NOT NULL DEFAULT 0,
      pot_end DOUBLE PRECISION NOT NULL DEFAULT 0,
      pot_price DOUBLE PRECISION NOT NULL DEFAULT 0,

      pink_pot_start DOUBLE PRECISION NOT NULL DEFAULT 0,
      pink_pot_end DOUBLE PRECISION NOT NULL DEFAULT 0,
      pink_pot_price DOUBLE PRECISION NOT NULL DEFAULT 0,

      purple_pot_start DOUBLE PRECISION NOT NULL DEFAULT 0,
      purple_pot_end DOUBLE PRECISION NOT NULL DEFAULT 0,
      purple_pot_price DOUBLE PRECISION NOT NULL DEFAULT 0,

      meso_hour DOUBLE PRECISION NOT NULL,
      hourly_rate DOUBLE PRECISION NOT NULL,

      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT,

      FOREIGN KEY (employee_id)
        REFERENCES employees(id)
    );
  `);
}

async function resetPostgresSequences(client) {
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('employees', 'id'),
      COALESCE((SELECT MAX(id) FROM employees), 1),
      true
    );
  `);

  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('logs', 'id'),
      COALESCE((SELECT MAX(id) FROM logs), 1),
      true
    );
  `);
}

async function migrateEmployees(client) {
  const employees = sqliteDb
    .prepare(`
      SELECT *
      FROM employees
      ORDER BY id
    `)
    .all();

  for (const employee of employees) {
    await client.query(
      `
        INSERT INTO employees (
          id,
          name,
          meso_hour,
          hourly_rate
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          meso_hour = EXCLUDED.meso_hour,
          hourly_rate = EXCLUDED.hourly_rate
      `,
      [
        employee.id,
        employee.name,
        employee.meso_hour,
        employee.hourly_rate,
      ],
    );
  }

  return employees.length;
}

async function migrateLogs(client) {
  const columns = sqliteDb
    .prepare("PRAGMA table_info(logs)")
    .all()
    .map((column) => column.name);

  const hasPaidColumns =
    columns.includes("is_paid") &&
    columns.includes("paid_at");

  const logs = sqliteDb
    .prepare(`
      SELECT *
      FROM logs
      ORDER BY id
    `)
    .all();

  for (const log of logs) {
    const isPaid = hasPaidColumns
      ? log.is_paid || 0
      : 0;

    const paidAt = hasPaidColumns
      ? log.paid_at || null
      : null;

    await client.query(
      `
        INSERT INTO logs (
          id,

          employee_id,
          work_date,
          shift,

          meso_start,
          meso_end,

          pot_start,
          pot_end,
          pot_price,

          pink_pot_start,
          pink_pot_end,
          pink_pot_price,

          purple_pot_start,
          purple_pot_end,
          purple_pot_price,

          meso_hour,
          hourly_rate,

          is_paid,
          paid_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17,
          $18, $19
        )
        ON CONFLICT (id)
        DO UPDATE SET
          employee_id = EXCLUDED.employee_id,
          work_date = EXCLUDED.work_date,
          shift = EXCLUDED.shift,

          meso_start = EXCLUDED.meso_start,
          meso_end = EXCLUDED.meso_end,

          pot_start = EXCLUDED.pot_start,
          pot_end = EXCLUDED.pot_end,
          pot_price = EXCLUDED.pot_price,

          pink_pot_start = EXCLUDED.pink_pot_start,
          pink_pot_end = EXCLUDED.pink_pot_end,
          pink_pot_price = EXCLUDED.pink_pot_price,

          purple_pot_start = EXCLUDED.purple_pot_start,
          purple_pot_end = EXCLUDED.purple_pot_end,
          purple_pot_price = EXCLUDED.purple_pot_price,

          meso_hour = EXCLUDED.meso_hour,
          hourly_rate = EXCLUDED.hourly_rate,

          is_paid = EXCLUDED.is_paid,
          paid_at = EXCLUDED.paid_at
      `,
      [
        log.id,

        log.employee_id,
        log.work_date,
        log.shift,

        log.meso_start,
        log.meso_end,

        log.pot_start || 0,
        log.pot_end || 0,
        log.pot_price || 0,

        log.pink_pot_start || 0,
        log.pink_pot_end || 0,
        log.pink_pot_price || 0,

        log.purple_pot_start || 0,
        log.purple_pot_end || 0,
        log.purple_pot_price || 0,

        log.meso_hour,
        log.hourly_rate,

        isPaid,
        paidAt,
      ],
    );
  }

  return logs.length;
}

async function runMigration() {
  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    await createPostgresTables(client);

    const employeeCount = await migrateEmployees(client);
    const logCount = await migrateLogs(client);

    await resetPostgresSequences(client);

    await client.query("COMMIT");

    console.log("Chuyển dữ liệu thành công.");
    console.log(`Nhân viên: ${employeeCount}`);
    console.log(`Dòng công: ${logCount}`);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Migration thất bại:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    sqliteDb.close();
    await postgresPool.end();
  }
}

runMigration(); 