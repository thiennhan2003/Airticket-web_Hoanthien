import * as yup from 'yup';

// Login schema
const loginSchema = yup.object({
  email: yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
  password: yup.string().min(6, 'Mật khẩu phải từ 6 ký tự').required('Mật khẩu là bắt buộc'),
});

// Register schema
export const registerSchema = yup.object({
  fullName: yup.string().required('Họ và tên là bắt buộc'),
email: yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
phoneNumber: yup.string()
    .min(10, 'Số điện thoại phải có ít nhất 10 chữ số')
    .max(15, 'Số điện thoại không được vượt quá 15 chữ số')
    .required('Số điện thoại là bắt buộc'),
password: yup.string().min(6).required('Mật khẩu là bắt buộc'),
});

export default {
  loginSchema,
  registerSchema,
};
