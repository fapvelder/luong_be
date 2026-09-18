import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "Thiếu MONGODB_URI. Kiểm tra Environment Variables hoặc file .env.",
  );
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);

let db;

export async function initializeDatabase() {
  await mongoClient.connect();

  db = mongoClient.db(
    process.env.MONGODB_DB_NAME || "luong",
  );

  const employees = db.collection("employees");
  const logs = db.collection("logs");

  await employees.createIndex(
    { postgres_id: 1 },
    { unique: true },
  );

  await employees.createIndex(
    { name: 1 },
    { unique: true },
  );

  await logs.createIndex(
    { postgres_id: 1 },
    { unique: true },
  );

  await logs.createIndex({
    employee_id: 1,
    work_date: 1,
  });

  console.log("MongoDB đã sẵn sàng.");
}

export function getDb() {
  if (!db) {
    throw new Error(
      "MongoDB chưa khởi tạo. Hãy gọi initializeDatabase() trước.",
    );
  }

  return db;
}

export default mongoClient;