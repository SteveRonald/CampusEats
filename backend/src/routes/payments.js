import { Router } from "express";
import { checkout, listTransactions } from "../controllers/paymentsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/checkout", authenticate, requireRole("student"), checkout);
router.get("/transactions", authenticate, requireRole("admin"), listTransactions);

export default router;
