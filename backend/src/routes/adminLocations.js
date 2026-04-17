import { Router } from "express";
import {
  adminCreateHostel,
  adminCreateServiceArea,
  adminDeleteHostel,
  adminDeleteServiceArea,
  adminUpdateHostel,
  adminUpdateServiceArea,
  listHostels,
  listServiceAreas
} from "../controllers/locationsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/service-areas", authenticate, requireRole("admin"), listServiceAreas);
router.post("/service-areas", authenticate, requireRole("admin"), adminCreateServiceArea);
router.patch("/service-areas/:id", authenticate, requireRole("admin"), adminUpdateServiceArea);
router.delete("/service-areas/:id", authenticate, requireRole("admin"), adminDeleteServiceArea);

router.get("/hostels", authenticate, requireRole("admin"), listHostels);
router.post("/hostels", authenticate, requireRole("admin"), adminCreateHostel);
router.patch("/hostels/:id", authenticate, requireRole("admin"), adminUpdateHostel);
router.delete("/hostels/:id", authenticate, requireRole("admin"), adminDeleteHostel);

export default router;