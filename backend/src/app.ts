import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";


// Routes
import userRoute from "./router/v1/users.route";
import authRoute from "./router/v1/auth.route";
import ticketRoute from "./router/v1/ticket.route";
import flightRoute from "./router/v1/flight.route";
import paymentRoute from "./router/v1/payment.route";
import seatLayoutRoute from "./router/v1/seatLayout.route";
import testEmailRoute from "./router/v1/test-email.route";

dotenv.config();
const app = express();

// 1️⃣ CORS: cho phép frontend React kết nối
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000", "http://localhost:3001"],
  credentials: true, // nếu cần gửi cookie
}));

// 2️⃣ Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3️⃣ Routes
// API v1
const apiV1Router = express.Router();

// Auth routes
apiV1Router.use('/auth', authRoute);

// User routes
apiV1Router.use('/users', userRoute);

// Ticket routes
apiV1Router.use('/tickets', ticketRoute);

// Flight routes
apiV1Router.use('/flights', flightRoute);

// Payment routes
apiV1Router.use('/payments', paymentRoute);

// Seat layout routes
apiV1Router.use('/seat-layout', seatLayoutRoute);

// Test email route (remove in production)
apiV1Router.use('/', testEmailRoute);

// Mount API v1 router
app.use('/api/v1', apiV1Router);

// 4️⃣ Test route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// 5️⃣ Middleware xử lý lỗi chung
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err); // log ra console để debug

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    status,
    message
  });
});

// 6️⃣ Middleware 404 (route không tồn tại)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: "Not Found"
  });
});

export default app;
