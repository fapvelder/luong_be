// import express from "express";
// import db from "../database.js";
// import { toNumber, calculateSalary } from "../payroll.js";

// const router = express.Router();

// router.get("/", (request, response) => {
//   try {
//     const employeeId = Number(request.query.employee_id);
//     const month = request.query.month;

//     if (!employeeId) {
//       throw new Error("Thiếu employee_id.");
//     }

//     if (!month) {
//       throw new Error("Thiếu tháng cần xem.");
//     }

//     const logs = db
//       .prepare(
//         `
//         SELECT *
//         FROM logs
//         WHERE employee_id = ?
//           AND substr(work_date, 1, 7) = ?
//         ORDER BY work_date DESC, id DESC
//       `,
//       )
//       .all(employeeId, month);

//     const calculatedLogs = logs.map(calculateSalary);

//     response.json(calculatedLogs);
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });
// router.patch("/:id/unpaid", (request, response) => {
//   try {
//     const logId = Number(request.params.id);

//     const result = db
//       .prepare(
//         `
//         UPDATE logs
//         SET
//           is_paid = 0,
//           paid_at = NULL
//         WHERE id = ?
//       `,
//       )
//       .run(logId);

//     if (result.changes === 0) {
//       return response.status(404).json({
//         error: "Không tìm thấy dòng công.",
//       });
//     }

//     response.json({
//       ok: true,
//       message: "Đã chuyển dòng công về trạng thái chưa trả.",
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });
// router.patch("/mark-paid", (request, response) => {
//   try {
//     const { employee_id, log_ids } = request.body;

//     const employeeId = Number(employee_id);

//     if (!employeeId) {
//       throw new Error("Thiếu employee_id.");
//     }

//     if (!Array.isArray(log_ids) || log_ids.length === 0) {
//       throw new Error("Vui lòng chọn ít nhất một ngày công.");
//     }

//     const logIds = log_ids.map((id) => Number(id));

//     const placeholders = logIds.map(() => "?").join(", ");

//     const updatePaidLogs = db.prepare(`
//       UPDATE logs
//       SET
//         is_paid = 1,
//         paid_at = datetime('now', 'localtime')
//       WHERE employee_id = ?
//         AND id IN (${placeholders})
//         AND is_paid = 0
//     `);

//     const result = updatePaidLogs.run(employeeId, ...logIds);

//     response.json({
//       ok: true,
//       updated_count: result.changes,
//       message: `Đã đánh dấu trả lương cho ${result.changes} ngày công.`,
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });
// router.post("/", (request, response) => {
//   try {
//     const data = request.body;

//     const employeeId = Number(data.employee_id);

//     const employee = db
//       .prepare(
//         `
//         SELECT *
//         FROM employees
//         WHERE id = ?
//       `,
//       )
//       .get(employeeId);

//     if (!employee) {
//       throw new Error("Không tìm thấy nhân viên.");
//     }

//     if (!data.work_date) {
//       throw new Error("Vui lòng chọn ngày làm.");
//     }

//     if (!data.shift) {
//       throw new Error("Vui lòng chọn ca làm.");
//     }

//     const mesoStart = toNumber(data.meso_start);
//     const mesoEnd = toNumber(data.meso_end);

//     const pinkPotStart = toNumber(data.pink_pot_start);
//     const pinkPotEnd = toNumber(data.pink_pot_end);
//     const pinkPotPrice = toNumber(data.pink_pot_price);

//     const purplePotStart = toNumber(data.purple_pot_start);
//     const purplePotEnd = toNumber(data.purple_pot_end);
//     const purplePotPrice = toNumber(data.purple_pot_price);

//     const result = db
//       .prepare(
//         `
//         INSERT INTO logs (
//           employee_id,
//           work_date,
//           shift,

//           meso_start,
//           meso_end,

//           pot_start,
//           pot_end,
//           pot_price,

//           pink_pot_start,
//           pink_pot_end,
//           pink_pot_price,

//           purple_pot_start,
//           purple_pot_end,
//           purple_pot_price,

//           meso_hour,
//           hourly_rate
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       )
//       .run(
//         employee.id,
//         data.work_date,
//         data.shift,

//         mesoStart,
//         mesoEnd,

//         // Pot cũ gán 0 để tương thích database cũ.
//         0,
//         0,
//         0,

//         pinkPotStart,
//         pinkPotEnd,
//         pinkPotPrice,

//         purplePotStart,
//         purplePotEnd,
//         purplePotPrice,

//         employee.meso_hour,
//         employee.hourly_rate,
//       );

//     response.status(201).json({
//       ok: true,
//       log_id: result.lastInsertRowid,
//       message: "Đã lưu dòng công.",
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });

// router.delete("/:id", (request, response) => {
//   try {
//     const logId = Number(request.params.id);

//     const result = db
//       .prepare(
//         `
//         DELETE FROM logs
//         WHERE id = ?
//       `,
//       )
//       .run(logId);

//     if (result.changes === 0) {
//       return response.status(404).json({
//         error: "Không tìm thấy dòng công.",
//       });
//     }

//     response.json({
//       ok: true,
//       message: "Đã xóa dòng công.",
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });

// export default router;
import express from "express";
import db from "../database.js";

import {
  toNumber,
  calculateSalary,
} from "../payroll.js";

const router = express.Router();

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

    const result = await db.query(
      `
        SELECT *
        FROM logs
        WHERE employee_id = $1
          AND substring(work_date FROM 1 FOR 7) = $2
        ORDER BY work_date DESC, id DESC
      `,
      [
        employeeId,
        month,
      ],
    );

    const calculatedLogs = result.rows.map(calculateSalary);

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

    if (!employeeId) {
      throw new Error("Thiếu employee_id.");
    }

    if (!Array.isArray(log_ids) || log_ids.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một ngày công.");
    }

    const logIds = log_ids.map((id) => Number(id));

    const result = await db.query(
      `
        UPDATE logs
        SET
          is_paid = 1,
          paid_at = CURRENT_TIMESTAMP::TEXT
        WHERE employee_id = $1
          AND id = ANY($2::int[])
          AND is_paid = 0
        RETURNING id
      `,
      [
        employeeId,
        logIds,
      ],
    );

    response.json({
      ok: true,
      updated_count: result.rowCount,
      message: `Đã đánh dấu trả lương cho ${result.rowCount} ngày công.`,
    });
  } catch (error) {
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

    const result = await db.query(
      `
        UPDATE logs
        SET
          is_paid = 0,
          paid_at = NULL
        WHERE id = $1
        RETURNING id
      `,
      [logId],
    );

    if (result.rowCount === 0) {
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

    const employeeResult = await db.query(
      `
        SELECT *
        FROM employees
        WHERE id = $1
      `,
      [employeeId],
    );

    const employee = employeeResult.rows[0];

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

    const pinkPotStart = toNumber(data.pink_pot_start);
    const pinkPotEnd = toNumber(data.pink_pot_end);
    const pinkPotPrice = toNumber(data.pink_pot_price);

    const purplePotStart = toNumber(data.purple_pot_start);
    const purplePotEnd = toNumber(data.purple_pot_end);
    const purplePotPrice = toNumber(data.purple_pot_price);

    const result = await db.query(
      `
        INSERT INTO logs (
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
          $1, $2, $3,
          $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, $16,
          $17, $18
        )
        RETURNING id
      `,
      [
        employee.id,
        data.work_date,
        data.shift,

        mesoStart,
        mesoEnd,

        // Các cột Pot cũ giữ giá trị 0.
        0,
        0,
        0,

        pinkPotStart,
        pinkPotEnd,
        pinkPotPrice,

        purplePotStart,
        purplePotEnd,
        purplePotPrice,

        employee.meso_hour,
        employee.hourly_rate,

        0,
        null,
      ],
    );

    response.status(201).json({
      ok: true,
      log_id: result.rows[0].id,
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

    const result = await db.query(
      `
        DELETE FROM logs
        WHERE id = $1
        RETURNING id
      `,
      [logId],
    );

    if (result.rowCount === 0) {
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