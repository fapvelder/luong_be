// import express from "express";
// import cors from "cors";

// import employeesRouter from "./routes/employees.routes.js";
// import logsRouter from "./routes/logs.routes.js";

// // Import database để khởi tạo bảng và cập nhật cột mới.
// import "./database.js";
// const PORT = process.env.PORT || 5000;

// const app = express();

// app.use(cors());

// app.use(express.json());

// app.get("/", (request, response) => {
//   response.json({
//     message: "Payroll Node.js API đang chạy.",
//   });
// });

// app.use("/api/employees", employeesRouter);

// app.use("/api/logs", logsRouter);

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Node API đang chạy tại port: ${PORT}`);
// });
import "dotenv/config";

import express from "express";
import cors from "cors";

import { initializeDatabase } from "./database.js";

import employeesRouter from "./routes/employees.routes.js";
import logsRouter from "./routes/logs.routes.js";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

app.get("/", (request, response) => {
  response.json({
    message: "Payroll PostgreSQL API đang chạy.",
  });
});

app.use("/api/employees", employeesRouter);

app.use("/api/logs", logsRouter);

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Node API đang chạy tại port ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:");
    console.error(error);

    process.exit(1);
  }
}

startServer();