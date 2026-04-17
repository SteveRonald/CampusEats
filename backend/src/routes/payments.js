import { Router } from "express";
import { checkout, getPaymentMode, handlePaymentCallback, listTransactions, simulatePaymentResult } from "../controllers/paymentsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/checkout", authenticate, requireRole("student"), checkout);
router.get("/callback", handlePaymentCallback);
router.get("/mode", authenticate, getPaymentMode);
router.post("/simulate/:orderId", authenticate, requireRole("admin"), simulatePaymentResult);
router.get("/transactions", authenticate, requireRole("admin"), listTransactions);

export default router;
