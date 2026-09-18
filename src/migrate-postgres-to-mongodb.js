    import "dotenv/config";
import pg from "pg";
import { MongoClient } from "mongodb";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("Thiếu DATABASE_URL trong file .env.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("Thiếu MONGODB_URI trong file .env.");
}

const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
    connectionTimeoutMillis: 15000,

});

const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function migrate() {
  await postgres.connect();
  await mongoClient.connect();

  const mongoDb = mongoClient.db(
    process.env.MONGODB_DB_NAME || "luong",
  );

  const employeesCollection = mongoDb.collection("employees");
  const logsCollection = mongoDb.collection("logs");

  /*
    Chỉ bật hai dòng này nếu MongoDB hiện chưa có dữ liệu quan trọng
    hoặc bạn muốn chạy lại migration từ đầu.

    await employeesCollection.deleteMany({});
    await logsCollection.deleteMany({});
  */

  const { rows: employees } = await postgres.query(`
    SELECT *
    FROM employees
    ORDER BY id ASC;
  `);

  const employeeIdMap = new Map();

  for (const employee of employees) {
    const document = {
      name: employee.name,
      meso_hour: Number(employee.meso_hour),
      hourly_rate: Number(employee.hourly_rate),

      postgres_id: Number(employee.id),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingEmployee = await employeesCollection.findOne({
      postgres_id: Number(employee.id),
    });

    if (existingEmployee) {
      await employeesCollection.updateOne(
        { _id: existingEmployee._id },
        {
          $set: document,
        },
      );

      employeeIdMap.set(
        Number(employee.id),
        existingEmployee._id,
      );
    } else {
      const result = await employeesCollection.insertOne(document);

      employeeIdMap.set(
        Number(employee.id),
        result.insertedId,
      );
    }
  }

  const { rows: logs } = await postgres.query(`
    SELECT *
    FROM logs
    ORDER BY id ASC;
  `);

  for (const log of logs) {
    const mongoEmployeeId = employeeIdMap.get(
      Number(log.employee_id),
    );

    if (!mongoEmployeeId) {
      console.warn(
        `Bỏ qua log PostgreSQL id=${log.id}: không tìm thấy employee_id=${log.employee_id}.`,
      );

      continue;
    }

    const document = {
      postgres_id: Number(log.id),

      employee_id: mongoEmployeeId,

      work_date: log.work_date,
      shift: log.shift,

      meso_start: Number(log.meso_start),
      meso_end: Number(log.meso_end),

      pot_start: Number(log.pot_start || 0),
      pot_end: Number(log.pot_end || 0),
      pot_price: Number(log.pot_price || 0),

      pink_pot_start: Number(log.pink_pot_start || 0),
      pink_pot_end: Number(log.pink_pot_end || 0),
      pink_pot_price: Number(log.pink_pot_price || 0),

      purple_pot_start: Number(log.purple_pot_start || 0),
      purple_pot_end: Number(log.purple_pot_end || 0),
      purple_pot_price: Number(log.purple_pot_price || 0),

      eel_start: Number(log.eel_start || 0),
      eel_end: Number(log.eel_end || 0),
      eel_price: Number(log.eel_price || 0),

      meso_hour: Number(log.meso_hour),
      hourly_rate: Number(log.hourly_rate),

      is_paid: Boolean(log.is_paid),
      paid_at: log.paid_at || null,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingLog = await logsCollection.findOne({
      postgres_id: Number(log.id),
    });

    if (existingLog) {
      await logsCollection.updateOne(
        { _id: existingLog._id },
        {
          $set: document,
        },
      );
    } else {
      await logsCollection.insertOne(document);
    }
  }

  await employeesCollection.createIndex(
    { name: 1 },
    { unique: true },
  );

  await employeesCollection.createIndex(
    { postgres_id: 1 },
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

  console.log(`Đã chuyển ${employees.length} nhân viên.`);
  console.log(`Đã xử lý ${logs.length} log công.`);
  console.log("Migration PostgreSQL → MongoDB hoàn tất.");
}

migrate()
  .catch((error) => {
    console.error("Migration thất bại:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.end();
    await mongoClient.close();
  });