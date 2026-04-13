import { Router } from "express";
import { handleIntaSendWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/intasend", handleIntaSendWebhook);

export default router;
