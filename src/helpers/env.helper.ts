import { config } from 'dotenv';
const originalLog = console.log;
console.log = () => {}; 
config();
console.log = originalLog;

// dùng file này quản lí các biến môi trường
export const env = {
    port: process.env.PORT || 8080,
    nodeEnv: process.env.NODE_ENV || "development",
    MongoDB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Khachsan",
    JWT_SECRET: process.env.JWT_SECRET
}