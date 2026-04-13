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

const router = Router();

router.get("/", listVendors);
router.get("/:id/orders", getVendorOrders);
router.get("/:id/earnings", getVendorEarnings);
router.get("/:id/menu", getVendorMenu);
router.post("/:id/menu", createVendorMenuItem);
router.patch("/:id/toggle", toggleVendor);
router.put("/menu/:itemId", updateVendorMenuItem);
router.delete("/menu/:itemId", deleteVendorMenuItem);

export default router;
