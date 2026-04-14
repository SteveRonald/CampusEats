import { Router } from "express";
import {
  createVendorMenuItem,
  deleteVendorMenuItem,
  getVendorEarnings,
  getVendorMenu,
  getVendorOrders,
  listVendors,
  toggleVendor,
  updateVendorMenuItem
} from "../controllers/vendorsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listVendors);
router.get("/:id/orders", authenticate, requireRole("vendor", "admin"), getVendorOrders);
router.get("/:id/earnings", authenticate, requireRole("vendor", "admin"), getVendorEarnings);
router.get("/:id/menu", authenticate, requireRole("vendor", "admin"), getVendorMenu);
router.post("/:id/menu", authenticate, requireRole("vendor", "admin"), createVendorMenuItem);
router.patch("/:id/toggle", authenticate, requireRole("admin"), toggleVendor);
router.put("/menu/:itemId", authenticate, requireRole("vendor", "admin"), updateVendorMenuItem);
router.delete("/menu/:itemId", authenticate, requireRole("vendor", "admin"), deleteVendorMenuItem);

export default router;
