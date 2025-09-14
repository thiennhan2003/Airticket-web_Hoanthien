import app from "./app";
import { env } from "./helpers/env.helper";
import mongoose from "mongoose";

/// Start the server
const mongooseDbOptions = {
    autoIndex: true, // Tự động tạo index
    maxPoolSize: 10, // Số lượng kết nối tối đa
    serverSelectionTimeoutMS: 5000, // Thời gian chờ chọn server (ms)
    socketTimeoutMS: 45000, // Thời gian chờ socket (ms)
    family: 4, // Sử dụng IPv4
};

mongoose
  .connect(env.MongoDB_URI as string, mongooseDbOptions)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    // Start the server after successful MongoDB connection
    app.listen(env.port, () => {
      console.log(`Server is running on port http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to Connect to MongoDB", err);
  });
