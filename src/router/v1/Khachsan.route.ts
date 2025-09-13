import express from "express";
const router = express.Router();

// khoi tao 1 khach san
const khachsan = {
    name: "Khachsan",
    address: "123 Main St1"
}

// Lấy danh sách khách sạn
router.get("/Khachsan", (req, res) => {
    res.send(khachsan);
});

// Tạo mới khách sạn
router.post("/Khachsan", (req, res) => {
    const { name, address } = req.body;
    // Xử lý logic tạo mới khách sạn ở đây
    console.log('Tạo mới khách sạn:', { name, address });
    res.status(201).json({ 
        success: true, 
        message: 'Tạo khách sạn thành công',
        data: { name, address }
    });
});
// sửa khách sạn
router.put("/Khachsan/:id", (req, res) => {
    const { name, address } = req.body;
    // Xử lý logic sửa khách sạn ở đây
    console.log('Sửa khách sạn:', { name, address });
    res.status(200).json({ 
        success: true, 
        message: 'Sửa khách sạn thành công',
        data: { name, address }
    });
});
// xóa khách sạn
router.delete("/Khachsan/:id", (req, res) => {
    const { id } = req.params;
    // Xử lý logic xóa khách sạn ở đây
    console.log('Xóa khách sạn có id:', id);
    res.status(200).json({ 
        success: true, 
        message: 'Xóa khách sạn thành công',
        data: { id }
    });
});

export default router;