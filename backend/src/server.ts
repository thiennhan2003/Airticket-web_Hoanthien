import app from "./app";
import { env } from "./helpers/env.helper";
import mongoose from "mongoose";
import backgroundJobsService from "./services/background-jobs.service";

// Theo dõi trạng thái server
let serverStarted = false;

/// Start the server
const mongooseDbOptions = {
    autoIndex: true, // Tự động tạo index
    maxPoolSize: 10, // Số lượng kết nối tối đa
    serverSelectionTimeoutMS: 5000, // Thời gian chờ chọn server (ms)
    socketTimeoutMS: 45000, // Thời gian chờ socket (ms)
    family: 4, // Sử dụng IPv4
};

// Hàm khởi tạo server
const startServer = async () => {
    try {
        // Chỉ khởi tạo server nếu chưa được khởi tạo
        if (serverStarted) {
            console.log("🔄 Server already running, skipping initialization");
            return;
        }

        console.log("🚀 Starting server...");

        // Kết nối MongoDB trước
        await mongoose.connect(env.MongoDB_URI as string, mongooseDbOptions);
        console.log("✅ Connected to MongoDB successfully");

        // Khởi tạo server
        const server = app.listen(env.port, () => {
            serverStarted = true;
            console.log(`🚀 Backend running at http://localhost:${env.port}`);

            // Khởi tạo background jobs sau khi server đã chạy
            try {
                backgroundJobsService.initializeJobs();
                console.log('🎯 Background jobs initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize background jobs:', error);
            }
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🔄 SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('🔐 Server closed');
                backgroundJobsService.stopAllJobs();
                mongoose.connection.close();
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🔄 SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('🔐 Server closed');
                backgroundJobsService.stopAllJobs();
                mongoose.connection.close();
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

// Khởi tạo server
startServer();
