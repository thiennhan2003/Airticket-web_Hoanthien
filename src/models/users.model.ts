import { Schema, model} from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
        },
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long']
        },
        role: {
            type: String,
            enum: ['user','admin','staff'],
            default: 'user'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);
//Middleware pre save ở lớp database
//trước khi data được lưu xuống ---> mã khóa mật khẩu

userSchema.pre('save', async function (next) {
    const user = this;
    // Nếu password không được set hoặc chưa thay đổi thì bỏ qua
    if (!user.isModified('password')) {
        return next();
    }

    if (!user.password) {
        return next(new Error("Password is required"));
    }

    const hash = bcrypt.hashSync(user.password, 10);

    user.password = hash;

    next();
})

export default model('User', userSchema);
