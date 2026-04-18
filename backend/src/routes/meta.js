import { Router } from "express";
import { getPublicContactInfo } from "../controllers/metaController.js";

const router = Router();

router.get("/contact", getPublicContactInfo);

export default router;
