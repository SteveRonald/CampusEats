import { Router } from "express";
import { checkout, listTransactions } from "../controllers/paymentsController.js";

const router = Router();

router.post("/checkout", checkout);
router.get("/transactions", listTransactions);

export default router;
