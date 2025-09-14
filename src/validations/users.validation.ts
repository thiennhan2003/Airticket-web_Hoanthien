import * as yup from "yup";

// get all
const getAllSchema = yup
  .object({
    query: yup.object({
      page: yup.number().integer().positive().optional(),
      limit: yup.number().integer().positive().optional(),
      sort_type: yup.string().oneOf(["asc", "desc"]).optional(),
      sort_by: yup.string().oneOf(["createdAt", "fullName", "email"]).optional(),
      keyword: yup.string().min(1).max(50).optional(),
    }),
  })
  .required();

// get by id
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

// create user
const createSchema = yup
  .object({
    body: yup.object({
      fullName: yup.string().min(2).max(100).required(),
      email: yup
        .string()
        .max(100)
        .email("Email address is invalid")
        .required(),
      phoneNumber: yup.string().min(6).max(20).required(),
      password: yup.string().min(6).max(255).required(),
      role: yup.string().oneOf(["user", "admin", "staff"]).optional(),
      isActive: yup.boolean().optional(),
    }),
  })
  .required();

// update user
const updateByIdSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
    body: yup.object({
      fullName: yup.string().min(2).max(100).optional(),
      email: yup.string().max(100).email().optional(),
      phoneNumber: yup.string().min(6).max(20).optional(),
      password: yup.string().min(6).max(255).optional(),
      role: yup.string().oneOf(["user", "admin", "staff"]).optional(),
      isActive: yup.boolean().optional(),
    }),
  })
  .required();

// delete user
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
