import express from "express";
import userController from "../../controllers/users.controller";
import validateSchemaYup from "../../middlewares/validate.middleware";
import userValidation from "../../validations/users.validation";
const router = express.Router();

//Get all users
router.get("/users", validateSchemaYup(userValidation.getAllSchema), userController.getAll);
//Get user by id
router.get("/users/:id", validateSchemaYup(userValidation.getByIdSchema), userController.getById);
//Create user
router.post("/users", validateSchemaYup(userValidation.createSchema), userController.Create);
//Update user
router.put("/users/:id", validateSchemaYup(userValidation.updateByIdSchema), userController.Update);
//Delete user
router.delete("/users/:id", validateSchemaYup(userValidation.deleteByIdSchema), userController.Delete);

export default router;
