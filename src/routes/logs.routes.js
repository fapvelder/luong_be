import express from "express";
import { getDb } from "../database.js";

import {
  toNumber,
  calculateSalary,
} from "../payroll.js";

const router = express.Router();

function formatLog(log) {
  return {
    ...log,

    /*
      Giữ id là số để frontend cũ không phải đổi.
      postgres_id chính là id cũ của PostgreSQL/migration.
    */
    id: log.postgres_id,

    /*
      Frontend cũ đang gửi employee_id dạng số.
      Trả về postgres_id của nhân viên thay vì ObjectId.
    */
    employee_id: log.employee_postgres_id,

    _id: undefined,
  };
}

/**
 * GET /api/logs?employee_id=1&month=2026-08
 * Lấy dòng công theo nhân viên và tháng.
 */
router.get("/", async (request, response) => {
  try {
    const employeeId = Number(request.query.employee_id);
    const month = request.query.month;

    if (!employeeId) {
      throw new Error("Thiếu employee_id.");
    }

    if (!month) {
      throw new Error("Thiếu tháng cần xem.");
    }

    const db = getDb();

    const employee = await db.collection("employees").findOne({
      postgres_id: employeeId,
    });

    if (!employee) {
      throw new Error("Không tìm thấy nhân viên.");
    }

    const logs = await db.collection("logs")
      .find({
        employee_id: employee._id,

        /*
          work_date có dạng YYYY-MM-DD.
          Regex này thay thế substring(work_date, 1, 7) SQL.
        */
        work_date: {
          $regex: `^${month}`,
        },
      })
      .sort({
        work_date: -1,
        postgres_id: -1,
      })
      .toArray();

    const calculatedLogs = logs
      .map(formatLog)
      .map(calculateSalary);

    response.json(calculatedLogs);
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/logs/mark-paid
 * Đánh dấu nhiều ngày công là đã trả lương.
 */
router.patch("/mark-paid", async (request, response) => {
  try {
    const { employee_id, log_ids } = request.body;

    const employeeId = Number(employee_id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new Error("Thiếu hoặc sai employee_id.");
    }

    if (!Array.isArray(log_ids) || log_ids.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một ngày công.");
    }

    const logIds = log_ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (logIds.length === 0) {
      throw new Error("Danh sách log_ids không hợp lệ.");
    }

    const db = getDb();

    const employee = await db.collection("employees").findOne({
      postgres_id: employeeId,
    });

    if (!employee) {
      return response.status(404).json({
        error: "Không tìm thấy nhân viên.",
      });
    }

    /*
      Dữ liệu cũ đã migrate có:
      - logs.employee_id: ObjectId của employee MongoDB
      - logs.postgres_id: id số cũ của PostgreSQL

      Vì vậy phải query bằng employee._id + postgres_id.
    */
    const result = await db.collection("logs").updateMany(
      {
        employee_id: employee._id,
        postgres_id: {
          $in: logIds,
        },
        is_paid: {
          $ne: true,
        },
      },
      {
        $set: {
          is_paid: true,
          paid_at: new Date().toISOString(),
          updatedAt: new Date(),
        },
      },
    );

    response.json({
      ok: true,

      matched_count: result.matchedCount,
      updated_count: result.modifiedCount,

      message:
        result.modifiedCount > 0
          ? `Đã đánh dấu trả lương cho ${result.modifiedCount} ngày công.`
          : "Không có dòng công chưa trả phù hợp để cập nhật.",
    });
  } catch (error) {
    console.error("Lỗi mark-paid:", error);

    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/logs/:id/unpaid
 * Hoàn tác trạng thái đã trả lương.
 */
router.patch("/:id/unpaid", async (request, response) => {
  try {
    const logId = Number(request.params.id);

    if (!logId) {
      throw new Error("ID dòng công không hợp lệ.");
    }

    const db = getDb();

    const result = await db.collection("logs").updateOne(
      {
        postgres_id: logId,
      },
      {
        $set: {
          is_paid: false,
          paid_at: null,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return response.status(404).json({
        error: "Không tìm thấy dòng công.",
      });
    }

    response.json({
      ok: true,
      message: "Đã chuyển dòng công về trạng thái chưa trả.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/logs
 * Thêm một dòng công mới.
 */
router.post("/", async (request, response) => {
  try {
    const data = request.body;

    const employeeId = Number(data.employee_id);

    if (!employeeId) {
      throw new Error("Thiếu employee_id.");
    }

    const db = getDb();

    const employee = await db.collection("employees").findOne({
      postgres_id: employeeId,
    });

    if (!employee) {
      throw new Error("Không tìm thấy nhân viên.");
    }

    if (!data.work_date) {
      throw new Error("Vui lòng chọn ngày làm.");
    }

    if (!data.shift) {
      throw new Error("Vui lòng chọn ca làm.");
    }

    const mesoStart = toNumber(data.meso_start);
    const mesoEnd = toNumber(data.meso_end);

    const potStart = toNumber(data.pot_start ?? 0);
    const potEnd = toNumber(data.pot_end ?? 0);
    const potPrice = toNumber(data.pot_price ?? 0);

    const pinkPotStart = toNumber(data.pink_pot_start ?? 0);
    const pinkPotEnd = toNumber(data.pink_pot_end ?? 0);
    const pinkPotPrice = toNumber(data.pink_pot_price ?? 0);

    const purplePotStart = toNumber(data.purple_pot_start ?? 0);
    const purplePotEnd = toNumber(data.purple_pot_end ?? 0);
    const purplePotPrice = toNumber(data.purple_pot_price ?? 0);

    const eelStart = toNumber(data.eel_start ?? 0);
    const eelEnd = toNumber(data.eel_end ?? 0);
    const eelPrice = toNumber(data.eel_price ?? 0);

    const logs = db.collection("logs");

    /*
      Để frontend cũ tiếp tục dùng log.id kiểu số,
      tự sinh postgres_id mới lớn hơn id cũ lớn nhất.
    */
    const lastLog = await logs
      .find({})
      .sort({
        postgres_id: -1,
      })
      .limit(1)
      .toArray();

    const nextLogId =
      lastLog.length > 0
        ? Number(lastLog[0].postgres_id) + 1
        : 1;

    const result = await logs.insertOne({
      postgres_id: nextLogId,

      employee_id: employee._id,
      employee_postgres_id: employee.postgres_id,

      work_date: data.work_date,
      shift: data.shift,

      meso_start: mesoStart,
      meso_end: mesoEnd,

      pot_start: potStart,
      pot_end: potEnd,
      pot_price: potPrice,

      pink_pot_start: pinkPotStart,
      pink_pot_end: pinkPotEnd,
      pink_pot_price: pinkPotPrice,

      purple_pot_start: purplePotStart,
      purple_pot_end: purplePotEnd,
      purple_pot_price: purplePotPrice,

      eel_start: eelStart,
      eel_end: eelEnd,
      eel_price: eelPrice,

      /*
        Lưu KPI/lương tại thời điểm tạo dòng công.
        Sau này sửa employee thì log cũ không bị đổi lương.
      */
      meso_hour: toNumber(employee.meso_hour),
      hourly_rate: toNumber(employee.hourly_rate),

      is_paid: false,
      paid_at: null,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    response.status(201).json({
      ok: true,
      log_id: nextLogId,
      mongo_id: result.insertedId.toString(),
      message: "Đã lưu dòng công.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * DELETE /api/logs/:id
 * Xóa một dòng công.
 */
router.delete("/:id", async (request, response) => {
  try {
    const logId = Number(request.params.id);

    if (!logId) {
      throw new Error("ID dòng công không hợp lệ.");
    }

    const db = getDb();

    const result = await db.collection("logs").deleteOne({
      postgres_id: logId,
    });

    if (result.deletedCount === 0) {
      return response.status(404).json({
        error: "Không tìm thấy dòng công.",
      });
    }

    response.json({
      ok: true,
      message: "Đã xóa dòng công.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

export default router;