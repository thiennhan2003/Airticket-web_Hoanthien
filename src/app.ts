import express, { Request, Response } from "express";
import KhachsanRoute from "./router/v1/Khachsan.route";
const app = express();

// Middleware để chuyển đổi dữ liệu JSON từ request body thành đối tượng JavaScript
// Giúp chúng ta có thể truy cập dữ liệu gửi lên từ client qua req.body
app.use(express.json())
app.use(express.urlencoded({ extended: false }));
// dùng file này quản lí các route
app.use("/api/v1", KhachsanRoute);



//Hello World
app.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
});

export default app;