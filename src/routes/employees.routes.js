// import express from "express";
// import db from "../database.js";
// import { toNumber } from "../payroll.js";

// const router = express.Router();

// router.get("/", (request, response) => {
//   const employees = db
//     .prepare(
//       `
//       SELECT *
//       FROM employees
//       ORDER BY name
//     `,
//     )
//     .all();

//   response.json(employees);
// });

// router.post("/", (request, response) => {
//   try {
//     const { name, meso_hour, hourly_rate } = request.body;

//     const employeeName = name?.trim();

//     if (!employeeName) {
//       throw new Error("Vui lòng nhập tên nhân viên.");
//     }

//     const mesoPerHour = toNumber(meso_hour);
//     const hourlyRate = toNumber(hourly_rate);

//     if (mesoPerHour <= 0) {
//       throw new Error("Meso mỗi giờ phải lớn hơn 0.");
//     }

//     if (hourlyRate < 0) {
//       throw new Error("Đơn giá giờ không được âm.");
//     }

//     const result = db
//       .prepare(
//         `
//         INSERT INTO employees (
//           name,
//           meso_hour,
//           hourly_rate
//         )
//         VALUES (?, ?, ?)
//       `,
//       )
//       .run(employeeName, mesoPerHour, hourlyRate);

//     response.status(201).json({
//       ok: true,
//       employee_id: result.lastInsertRowid,
//       message: "Đã thêm nhân viên.",
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });
// router.patch("/:id", (request, response) => {
//   try {
//     const employeeId = Number(request.params.id);

//     const { meso_hour, hourly_rate } = request.body;

//     const mesoPerHour = toNumber(meso_hour);
//     const hourlyRate = toNumber(hourly_rate);

//     if (mesoPerHour <= 0) {
//       throw new Error("KPI Meso/giờ phải lớn hơn 0.");
//     }

//     if (hourlyRate < 0) {
//       throw new Error("Đơn giá giờ không được âm.");
//     }

//     const result = db
//       .prepare(
//         `
//         UPDATE employees
//         SET
//           meso_hour = ?,
//           hourly_rate = ?
//         WHERE id = ?
//       `,
//       )
//       .run(mesoPerHour, hourlyRate, employeeId);

//     if (result.changes === 0) {
//       return response.status(404).json({
//         error: "Không tìm thấy nhân viên.",
//       });
//     }

//     response.json({
//       ok: true,
//       message: "Đã cập nhật KPI Meso/giờ và đơn giá giờ.",
//     });
//   } catch (error) {
//     response.status(400).json({
//       error: error.message,
//     });
//   }
// });
// router.delete("/:id", (request, response) => {
//   try {
//     const employeeId = Number(request.params.id);

//     const deleteEmployee = db.transaction((id) => {
//       db.prepare(
//         `
//         DELETE FROM logs
//         WHERE employee_id = ?
//       `,
//       ).run(id);

//       return db
//         .prepare(
//           `
//           DELETE FROM employees
//           WHERE id = ?
//         `,
//         )
//         .run(id);
//     });

//     const result = deleteEmployee(employeeId);

//     if (result.changes === 0) {
//       return response.status(404).json({
//         error: "Không tìm thấy nhân viên.",
//       });
//     }

//     response.json({
//       ok: true,
//       message: "Đã xóa nhân viên và toàn bộ dòng công.",
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
import { toNumber } from "../payroll.js";

const router = express.Router();

/**
 * GET /api/employees
 * Lấy toàn bộ danh sách nhân viên.
 */
router.get("/", async (request, response) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM employees
      ORDER BY name
    `);

    response.json(result.rows);
  } catch (error) {
    response.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/employees
 * Tạo nhân viên mới.
 */
router.post("/", async (request, response) => {
  try {
    const { name, meso_hour, hourly_rate } = request.body;

    const employeeName = name?.trim();

    if (!employeeName) {
      throw new Error("Vui lòng nhập tên nhân viên.");
    }

    const mesoPerHour = toNumber(meso_hour);
    const hourlyRate = toNumber(hourly_rate);

    if (mesoPerHour <= 0) {
      throw new Error("KPI Meso/giờ phải lớn hơn 0.");
    }

    if (hourlyRate < 0) {
      throw new Error("Đơn giá giờ không được âm.");
    }

    const result = await db.query(
      `
        INSERT INTO employees (
          name,
          meso_hour,
          hourly_rate
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        employeeName,
        mesoPerHour,
        hourlyRate,
      ],
    );

    response.status(201).json({
      ok: true,
      employee_id: result.rows[0].id,
      message: "Đã thêm nhân viên.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/employees/:id
 * Cập nhật KPI Meso/giờ và đơn giá giờ.
 */
router.patch("/:id", async (request, response) => {
  try {
    const employeeId = Number(request.params.id);

    const { meso_hour, hourly_rate } = request.body;

    const mesoPerHour = toNumber(meso_hour);
    const hourlyRate = toNumber(hourly_rate);

    if (mesoPerHour <= 0) {
      throw new Error("KPI Meso/giờ phải lớn hơn 0.");
    }

    if (hourlyRate < 0) {
      throw new Error("Đơn giá giờ không được âm.");
    }

    const result = await db.query(
      `
        UPDATE employees
        SET
          meso_hour = $1,
          hourly_rate = $2
        WHERE id = $3
        RETURNING id
      `,
      [
        mesoPerHour,
        hourlyRate,
        employeeId,
      ],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({
        error: "Không tìm thấy nhân viên.",
      });
    }

    response.json({
      ok: true,
      message: "Đã cập nhật KPI Meso/giờ và đơn giá giờ.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

/**
 * DELETE /api/employees/:id
 * Xóa nhân viên. Các dòng công sẽ tự bị xóa
 * vì bảng PostgreSQL đã dùng ON DELETE CASCADE.
 */
router.delete("/:id", async (request, response) => {
  try {
    const employeeId = Number(request.params.id);

    const result = await db.query(
      `
        DELETE FROM employees
        WHERE id = $1
        RETURNING id
      `,
      [employeeId],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({
        error: "Không tìm thấy nhân viên.",
      });
    }

    response.json({
      ok: true,
      message: "Đã xóa nhân viên và toàn bộ dòng công.",
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

export default router;