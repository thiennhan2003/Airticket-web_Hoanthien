import express from "express";
import userController from "../../controllers/users.controller";
import validateSchemaYup from "../../middlewares/validate.middleware";
import userValidation from "../../validations/users.validation";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

// Get all users (tạm thời bỏ auth để test)
router.get(
  "/", 
  // authenticateToken,
  validateSchemaYup(userValidation.getAllSchema), 
  userController.getAll
);

// Get user by id (tạm thời bỏ auth để test)
router.get(
  "/:id", 
  // authenticateToken,
  validateSchemaYup(userValidation.getByIdSchema), 
  userController.getById
);

// Update user (tạm thời bỏ auth để test)
router.put(
  "/:id",
  // authenticateToken, 
  validateSchemaYup(userValidation.updateByIdSchema), 
  userController.Update
);

// Delete user (tạm thời bỏ auth để test)
router.delete(
  "/:id",
  // authenticateToken,
  validateSchemaYup(userValidation.deleteByIdSchema), 
  userController.Delete
);

export default router;
