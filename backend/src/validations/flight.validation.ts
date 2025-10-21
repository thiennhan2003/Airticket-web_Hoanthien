import * as yup from "yup";

// Get all flights (phân trang + sort)
const getAllSchema = yup.object({
  query: yup.object({
    page: yup.number().integer().positive().optional(),
    limit: yup.number().integer().positive().optional(),
    sort_type: yup.string().oneOf(["asc", "desc"]).optional(),
    sort_by: yup.string().oneOf(["createdAt", "route", "departureTime"]).optional(),
    route: yup.string().optional(),
  }),
});

// Get flight by id
const getByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Flight ID is required"),
  }),
});

// Create flight
const createSchema = yup.object({
  body: yup.object({
    flightCode: yup.string().required("Flight code is required"),
    route: yup.string().required("Route is required"),
    departureTime: yup.date().required("Departure time is required"),
    arrivalTime: yup.date().required("Arrival time is required"),
    firstClassPrice: yup.number().min(0, "First class price must be >= 0").required("First class price is required"),
    businessPrice: yup.number().min(0, "Business price must be >= 0").required("Business price is required"),
    economyPrice: yup.number().min(0, "Economy price must be >= 0").required("Economy price is required"),
  }),
});

// Update flight
const updateByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Flight ID is required"),
  }),
  body: yup.object({
    flightCode: yup.string().optional(),
    route: yup.string().optional(),
    departureTime: yup.date().optional(),
    arrivalTime: yup.date().optional(),
    firstClassPrice: yup.number().min(0, "First class price must be >= 0").optional(),
    businessPrice: yup.number().min(0, "Business price must be >= 0").optional(),
    economyPrice: yup.number().min(0, "Economy price must be >= 0").optional(),
    delayReason: yup.string().optional(), // Lý do delay khi thay đổi lịch bay
  }),
});

// Delete flight
const deleteByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Flight ID is required"),
  }),
});

export default {
  getAllSchema,
  getByIdSchema,
  createSchema,
  updateByIdSchema,
  deleteByIdSchema,
};
