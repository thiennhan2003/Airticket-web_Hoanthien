import express from "express";
import userController from "../../controllers/users.controller";
const router = express.Router();

//Get all users
router.get("/users", userController.getAll);
//Get user by id
router.get("/users/:id", userController.getById);
//Create user
router.post("/users", userController.Create);
//Update user
router.put("/users/:id", userController.Update);
//Delete user
router.delete("/users/:id", userController.Delete);

export default router;
