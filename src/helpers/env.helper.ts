import { config } from 'dotenv';
const originalLog = console.log;
console.log = () => {}; 
config();
console.log = originalLog;

// dùng file này quản lí các biến môi trường
export const env = {
    port: process.env.PORT || 8080,
    nodeEnv: process.env.NODE_ENV || "development",
}