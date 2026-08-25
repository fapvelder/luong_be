import express from "express";
import cors from "cors";

import employeesRouter from "./routes/employees.routes.js";
import logsRouter from "./routes/logs.routes.js";

// Import database để khởi tạo bảng và cập nhật cột mới.
import "./database.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (request, response) => {
  response.json({
    message: "Payroll Node.js API đang chạy.",
  });
});

app.use("/api/employees", employeesRouter);

app.use("/api/logs", logsRouter);

app.listen(5000, "127.0.0.1", () => {
  console.log("Node API đang chạy tại:");
  console.log("http://127.0.0.1:5000");
});
