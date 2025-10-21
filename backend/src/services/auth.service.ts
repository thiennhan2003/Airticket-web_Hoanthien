import createError from "http-errors";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/users.model";
import bcrypt from "bcryptjs";
import { env } from "../helpers/env.helper";

interface IUserRegister {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

// --------------------- REGISTER ---------------------
const register = async ({ fullName, email, password, phoneNumber }: IUserRegister) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Kiểm tra email đã tồn tại
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createError(400, "Email already in use");
  }

  // Password sẽ được hash tự động nhờ userSchema.pre('save')
  const newUser = await User.create({
    fullName,
    email: normalizedEmail,
    password, // <- pre('save') hash tự động
    phoneNumber,
  });

  console.log("New registered user:", newUser); // debug

  return {
    id: newUser._id,
    fullName: newUser.fullName,
    email: newUser.email,
    phoneNumber: newUser.phoneNumber,
  };
};

// --------------------- LOGIN ---------------------
const login = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  console.log("Login attempt for:", normalizedEmail);

  // Tìm user với email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    console.log("User not found");
    throw createError(401, "Invalid email or password");
  }
  
  // Kiểm tra mật khẩu
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.log("Password does not match");
    throw createError(401, "Invalid email or password");
  }
  
  console.log("Login successful for user:", user.email);

  // Tạo access token
  const accessToken = jwt.sign(
    { _id: user._id, email: user.email },
    env.JWT_SECRET as string,
    { expiresIn: "24h" }
  );
  const refreshToken = jwt.sign(
    { _id: user._id, email: user.email },
    env.JWT_SECRET as string,
    { expiresIn: "365d" }
  );

  // Trả về một đối tượng đơn giản
  return {
    user: { 
      id: user._id, 
      fullName: user.fullName, 
      email: user.email,
      role: user.role 
    },
    accessToken,
    refreshToken,
    expiresIn: '24h'
  };
};

// --------------------- GET PROFILE ---------------------
const getProfile = async (user: any) => {
  if (!user) {
    throw createError(401, "Unauthorized");
  }
  return user;
};

// --------------------- UPDATE PROFILE ---------------------
const updateProfile = async (user: any, updateData: any) => {
  if (!user) {
    throw createError(401, "Unauthorized");
  }

  // Lấy thông tin user hiện tại từ database
  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    throw createError(404, "User not found");
  }

  // Cập nhật các trường được phép
  const allowedFields = ['fullName', 'email', 'phoneNumber'];
  const updates: any = {};

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  });

  // Kiểm tra email đã tồn tại (nếu có thay đổi email)
  if (updates.email && updates.email !== currentUser.email) {
    const existingUser = await User.findOne({ email: updates.email });
    if (existingUser) {
      throw createError(400, "Email already in use");
    }
  }

  // Cập nhật user
  Object.assign(currentUser, updates);
  await currentUser.save();

  return {
    id: currentUser._id,
    fullName: currentUser.fullName,
    email: currentUser.email,
    phoneNumber: currentUser.phoneNumber,
    role: currentUser.role
  };
};

// --------------------- 2FA HELPERS ---------------------
// Validate login credentials without generating tokens
const validateLogin = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Tìm user với email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return null;
  }

  // Kiểm tra mật khẩu
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  return user;
};

// Get user by email
const getUserByEmail = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw createError(404, "User not found");
  }
  return user;
};

// Generate tokens for 2FA verification
const generateTokens = (user: any) => {
  // Tạo access token
  const accessToken = jwt.sign(
    { _id: user._id, email: user.email },
    env.JWT_SECRET as string,
    { expiresIn: "24h" }
  );
  const refreshToken = jwt.sign(
    { _id: user._id, email: user.email },
    env.JWT_SECRET as string,
    { expiresIn: "365d" }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: '24h'
  };
};

export default {
  register,
  login,
  getProfile,
  updateProfile,
  validateLogin,
  getUserByEmail,
  generateTokens
};
