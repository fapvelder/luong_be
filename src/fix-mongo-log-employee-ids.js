import "dotenv/config";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Thiếu MONGODB_URI.");
}

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();

  const db = client.db(
    process.env.MONGODB_DB_NAME || "luong",
  );

  const employees = db.collection("employees");
  const logs = db.collection("logs");

  const allEmployees = await employees.find({}).toArray();

  const employeeIdMap = new Map(
    allEmployees.map((employee) => [
      employee._id.toString(),
      employee.postgres_id,
    ]),
  );

  const allLogs = await logs.find({}).toArray();

  let updatedCount = 0;

  for (const log of allLogs) {
    const employeePostgresId = employeeIdMap.get(
      log.employee_id?.toString(),
    );

    if (!employeePostgresId) {
      console.warn(
        `Không tìm được employee cho log postgres_id=${log.postgres_id}.`,
      );

      continue;
    }

    await logs.updateOne(
      {
        _id: log._id,
      },
      {
        $set: {
          employee_postgres_id: employeePostgresId,
          updatedAt: new Date(),
        },
      },
    );

    updatedCount += 1;
  }

  console.log(
    `Đã cập nhật employee_postgres_id cho ${updatedCount} logs.`,
  );
} catch (error) {
  console.error("Cập nhật thất bại:");
  console.error(error);

  process.exitCode = 1;
} finally {
  await client.close();
}