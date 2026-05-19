import * as yup from "yup";

// get all tickets
const getAllSchema = yup
  .object({
    query: yup.object({
      page: yup.number().integer().positive().optional(),
      limit: yup.number().integer().positive().optional(),
      sort_type: yup.string().oneOf(["asc", "desc"]).optional(),
      sort_by: yup
        .string()
        .oneOf(["createdAt", "passengerName", "email", "phoneNumber", "price", "status", "bookingDate"])
        .optional(),
      keyword: yup.string().min(1).max(50).optional(),
    }),
  })
  .required();

// get ticket by id
const getByIdSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
  })
  .required();

// create ticket - validation phù hợp với cách hoạt động hiện tại
const createSchema = yup
  .object({
    body: yup.object({
      flightCode: yup.string().min(1).max(20).required("Flight code is required"),
      seatNumber: yup.string().min(1).max(10).required("Seat number is required"),
      price: yup.number().min(0, "Price must be greater than or equal to 0").required("Ticket price is required"),
      passengerCount: yup.number().min(1, "At least 1 passenger is required").required("Passenger count is required"),
      passengerName: yup.string().min(2).max(100).required("Passenger name is required"),
      email: yup.string().email("Email is invalid").max(100).required("Email is required"),
      phoneNumber: yup.string().min(6).max(20).required("Phone number is required"),
      userId: yup.string().matches(/^[0-9a-fA-F]{24}$/, { message: "User ID must be a valid ObjectId" }).required("User ID is required"),
      // ✅ Loại bỏ giới hạn cứng, sẽ kiểm tra dựa trên số ghế còn lại của chuyến bay trong controller
    }),
  })
  .required();

// update ticket
const updateByIdSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
    body: yup.object({
      passengerName: yup.string().min(2).max(100).optional(),
      email: yup.string().email("Email is invalid").max(100).optional(),
      phoneNumber: yup.string().min(6).max(20).optional(),
      seatNumber: yup.string().min(1).max(10).optional(),
      price: yup.number().min(0, "Price must be greater than or equal to 0").optional(),
      status: yup.string().oneOf(["booked", "cancelled", "checked-in"]).optional(),
      bookingDate: yup.date().optional(),
    }),
  })
  .required();

// delete ticket
const deleteByIdSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
  })
  .required();

export default {
  getAllSchema,
  getByIdSchema,
  createSchema,
  updateByIdSchema,
  deleteByIdSchema,
};
