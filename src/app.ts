import express, { Request, Response, NextFunction } from "express";
import userRoute from "./router/v1/users.route";
import authRoute from "./router/v1/auth.route";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1", userRoute);
app.use("/api/v1/auth", authRoute);

// Hello World
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// Middleware xử lý lỗi
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

// Middleware 404 (route không tồn tại)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: "Not Found"
  });
});

export default app;
