import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Thiếu MONGODB_URI trong file .env.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = "https://luong-be.onrender.com/api";

const logRequests = [
  {
    employee_id: 2,
    month: "2026-09",
  },
  {
    employee_id: 3,
    month: "2026-09",
  },
  {
    employee_id: 7,
    month: "2026-09",
  },
  {
    employee_id: 5,
    month: "2026-09",
  },
  {
    employee_id: 3,
    month: "2026-08",
  },
  {
    employee_id: 2,
    month: "2026-08",
  },
];

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function toBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API lỗi ${response.status} ${response.statusText}: ${url}`,
    );
  }

  return response.json();
}

async function migrate() {
  console.log("Đang tải danh sách nhân viên từ Render API...");

  const employees = await getJson(
    `${API_BASE_URL}/employees`,
  );

  if (!Array.isArray(employees)) {
    throw new Error("API /employees không trả về mảng JSON.");
  }

  console.log(`Đã nhận ${employees.length} nhân viên.`);

  const allLogs = [];

  for (const request of logRequests) {
    const url = new URL(`${API_BASE_URL}/logs`);

    url.searchParams.set(
      "employee_id",
      String(request.employee_id),
    );

    url.searchParams.set("month", request.month);

    console.log(`Đang tải logs: ${url.toString()}`);

    const logs = await getJson(url.toString());

    if (!Array.isArray(logs)) {
      throw new Error(
        `API logs không trả về mảng: employee_id=${request.employee_id}, month=${request.month}`,
      );
    }

    allLogs.push(...logs);
  }

  const uniqueLogs = Array.from(
    new Map(
      allLogs.map((log) => [
        String(log.id),
        log,
      ]),
    ).values(),
  );

  console.log(`Đã nhận ${uniqueLogs.length} logs không trùng.`);

  const backupFolder = path.join(
    __dirname,
    "..",
    "backups",
  );

  await fs.mkdir(backupFolder, {
    recursive: true,
  });

  const backupPath = path.join(
    backupFolder,
    `render-api-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`,
  );

  await fs.writeFile(
    backupPath,
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        employees,
        logs: uniqueLogs,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Đã tạo file backup local: ${backupPath}`);

  const mongoClient = new MongoClient(
    process.env.MONGODB_URI,
  );

  await mongoClient.connect();

  const db = mongoClient.db(
    process.env.MONGODB_DB_NAME || "luong",
  );

  const employeesCollection = db.collection("employees");
  const logsCollection = db.collection("logs");

  const employeeIdMap = new Map();

  for (const employee of employees) {
    const postgresId = toNumber(employee.id);

    if (!postgresId) {
      console.warn("Bỏ qua employee không có id:", employee);

      continue;
    }

    const employeeDocument = {
      postgres_id: postgresId,
      name: String(employee.name || "").trim(),
      meso_hour: toNumber(employee.meso_hour, 7000000),
      hourly_rate: toNumber(employee.hourly_rate, 22000),
      updatedAt: new Date(),
    };

    const result = await employeesCollection.findOneAndUpdate(
      {
        postgres_id: postgresId,
      },
      {
        $set: employeeDocument,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    employeeIdMap.set(postgresId, result._id);
  }

  for (const log of uniqueLogs) {
    const postgresId = toNumber(log.id);

    const employeePostgresId = toNumber(
      log.employee_id,
    );

    const employeeObjectId = employeeIdMap.get(
      employeePostgresId,
    );

    if (!postgresId || !employeeObjectId) {
      console.warn(
        `Bỏ qua log id=${log.id}: không tìm thấy employee_id=${log.employee_id}.`,
      );

      continue;
    }

    const logDocument = {
      postgres_id: postgresId,
      employee_id: employeeObjectId,

      work_date: log.work_date,
      shift: log.shift,

      meso_start: toNumber(log.meso_start),
      meso_end: toNumber(log.meso_end),

      pot_start: toNumber(log.pot_start),
      pot_end: toNumber(log.pot_end),
      pot_price: toNumber(log.pot_price),

      pink_pot_start: toNumber(log.pink_pot_start),
      pink_pot_end: toNumber(log.pink_pot_end),
      pink_pot_price: toNumber(log.pink_pot_price),

      purple_pot_start: toNumber(log.purple_pot_start),
      purple_pot_end: toNumber(log.purple_pot_end),
      purple_pot_price: toNumber(log.purple_pot_price),

      eel_start: toNumber(log.eel_start),
      eel_end: toNumber(log.eel_end),
      eel_price: toNumber(log.eel_price),

      meso_hour: toNumber(log.meso_hour),
      hourly_rate: toNumber(log.hourly_rate),

      is_paid: toBoolean(log.is_paid),
      paid_at: log.paid_at || null,

      updatedAt: new Date(),
    };

    await logsCollection.updateOne(
      {
        postgres_id: postgresId,
      },
      {
        $set: logDocument,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    );
  }

  await employeesCollection.createIndex(
    { postgres_id: 1 },
    { unique: true },
  );

  await employeesCollection.createIndex(
    { name: 1 },
    { unique: true },
  );

  await logsCollection.createIndex(
    { postgres_id: 1 },
    { unique: true },
  );

  await logsCollection.createIndex({
    employee_id: 1,
    work_date: 1,
  });

  const employeeCount = await employeesCollection.countDocuments();

  const logCount = await logsCollection.countDocuments();

  console.log(`MongoDB hiện có ${employeeCount} nhân viên.`);
  console.log(`MongoDB hiện có ${logCount} logs.`);
  console.log("Migration từ Render API sang MongoDB hoàn tất.");

  await mongoClient.close();
}

migrate().catch((error) => {
  console.error("Migration thất bại:");
  console.error(error);
  process.exitCode = 1;
});