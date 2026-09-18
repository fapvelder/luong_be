import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("Thiếu DATABASE_URL trong file .env.");
}

const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },

  connectionTimeoutMillis: 15000,
});

try {
  const result = await postgres.query(`
    SELECT
      current_database() AS database_name,
      NOW() AS connected_at;
  `);

  console.log("Kết nối PostgreSQL thành công:");
  console.log(result.rows[0]);
} catch (error) {
  console.error("Kết nối PostgreSQL thất bại:");
  console.error("Tên lỗi:", error.name);
  console.error("Message:", error.message);
  console.error("Code:", error.code);
  console.error("Stack:", error.stack);
} finally {
  await postgres.end();
}