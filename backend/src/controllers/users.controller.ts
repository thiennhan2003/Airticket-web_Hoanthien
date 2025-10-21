import { NextFunction, Request, Response } from "express";
import usersService from "../services/users.service";
import { sendJsonSuccess, httpStatus } from "../helpers/response.helper";


// Get all users
const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await usersService.getAll(req.query);
    sendJsonSuccess(res, users, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Get user by id
const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await usersService.getById(id);
    sendJsonSuccess(res, user, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Create user
const Create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const user = await usersService.create(payload);
    sendJsonSuccess(
      res,
      user,
      httpStatus.CREATED.statusCode,
      httpStatus.CREATED.message
    );
  } catch (error) {
    next(error);
  }
};

// Update user
const Update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const user = await usersService.updateById(id, payload);
    sendJsonSuccess(res, user, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Delete user
const Delete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await usersService.deleteById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


// ✅ Register
const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.register(req.body);
    sendJsonSuccess(
      res,
      user,
      httpStatus.CREATED.statusCode,
      "Đăng ký thành công"
    );
  } catch (error) {
    next(error);
  }
};



export default {
  getAll,
  getById,
  Create,
  Update,
  Delete,
  register
};
