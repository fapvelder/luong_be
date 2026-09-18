import express from "express";
import { getDb } from "../database.js";
import { toNumber } from "../payroll.js";

const router = express.Router();

function formatEmployee(employee) {
  return {
    ...employee,

    // Giữ API frontend cũ: employee.id vẫn là số.
    id: employee.postgres_id,

    // Không cần gửi _id ObjectId cho frontend hiện tại.
    _id: undefined,
  };
}

/**
 * GET /api/employees
 * Lấy toàn bộ danh sách nhân viên.
 */
router.get("/", async (request, response) => {
  try {
    const db = getDb();

    const employees = await db
      .collection("employees")
      .find({})
      .sort({
        name: 1,
      })
      .toArray();

    response.json(employees.map(formatEmployee));
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

    const db = getDb();
    const employees = db.collection("employees");

    const lastEmployee = await employees
      .find({})
      .sort({
        postgres_id: -1,
      })
      .limit(1)
      .toArray();

    const nextEmployeeId =
      lastEmployee.length > 0
        ? Number(lastEmployee[0].postgres_id) + 1
        : 1;

    const result = await employees.insertOne({
      postgres_id: nextEmployeeId,
      name: employeeName,
      meso_hour: mesoPerHour,
      hourly_rate: hourlyRate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    response.status(201).json({
      ok: true,
      employee_id: nextEmployeeId,
      mongo_id: result.insertedId.toString(),
      message: "Đã thêm nhân viên.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(400).json({
        error: "Tên nhân viên đã tồn tại.",
      });
    }

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

    if (!employeeId) {
      throw new Error("ID nhân viên không hợp lệ.");
    }

    const { meso_hour, hourly_rate } = request.body;

    const mesoPerHour = toNumber(meso_hour);
    const hourlyRate = toNumber(hourly_rate);

    if (mesoPerHour <= 0) {
      throw new Error("KPI Meso/giờ phải lớn hơn 0.");
    }

    if (hourlyRate < 0) {
      throw new Error("Đơn giá giờ không được âm.");
    }

    const db = getDb();

    const result = await db.collection("employees").updateOne(
      {
        postgres_id: employeeId,
      },
      {
        $set: {
          meso_hour: mesoPerHour,
          hourly_rate: hourlyRate,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
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
 * Xóa nhân viên và tất cả dòng công liên quan.
 */
router.delete("/:id", async (request, response) => {
  try {
    const employeeId = Number(request.params.id);

    if (!employeeId) {
      throw new Error("ID nhân viên không hợp lệ.");
    }

    const db = getDb();
    const employees = db.collection("employees");
    const logs = db.collection("logs");

    const employee = await employees.findOne({
      postgres_id: employeeId,
    });

    if (!employee) {
      return response.status(404).json({
        error: "Không tìm thấy nhân viên.",
      });
    }

    /*
      MongoDB không có ON DELETE CASCADE tự động như PostgreSQL.
      Vì vậy phải xóa logs trước, rồi xóa employee.
    */
    await logs.deleteMany({
      employee_id: employee._id,
    });

    await employees.deleteOne({
      _id: employee._id,
    });

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