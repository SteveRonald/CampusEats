import { Router } from "express";
import { listHostels, listServiceAreas } from "../controllers/locationsController.js";

const router = Router();

router.get("/service-areas", listServiceAreas);
router.get("/hostels", listHostels);

export default router;