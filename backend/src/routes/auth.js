import { Router } from "express";
import { adminLogin, forgotPassword, login, me, register, updateProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/forgot-password", forgotPassword);
router.get("/me", authenticate, me);
router.patch("/profile", authenticate, updateProfile);

export default router;
