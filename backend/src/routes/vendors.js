import { Router } from "express";
import {
  createVendorMenuItem,
  deleteVendorMenuItem,
  createVendorDeliveryLocation,
  getVendorDeliveryLocationRecommendations,
  acceptVendorDeliveryLocationRecommendation,
  ignoreVendorDeliveryLocationRecommendation,
  getVendorEarnings,
  getVendorDeliveryLocations,
  getVendorServiceAreas,
  getVendorMenu,
  getVendorOrders,
  getVendorProfile,
  getAdminMenuReview,
  updateMenuVerificationStatus,
  updateVendorVerificationStatus,
  updateVendorProfile,
  updateVendorDeliveryLocation,
  updateVendorServiceAreas,
  deleteVendorDeliveryLocation,
  listVendors,
  toggleVendor,
  updateVendorMenuItem
} from "../controllers/vendorsController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, requireRole("admin"), listVendors);
router.get("/:id/service-areas", authenticate, requireRole("vendor", "admin"), getVendorServiceAreas);
router.get("/:id/delivery-locations", getVendorDeliveryLocations);
router.get("/:id/delivery-location-recommendations", authenticate, requireRole("vendor", "admin"), getVendorDeliveryLocationRecommendations);
router.post("/:id/delivery-locations", authenticate, requireRole("vendor", "admin"), createVendorDeliveryLocation);
router.post(
  "/delivery-location-recommendations/:recommendationId/accept",
  authenticate,
  requireRole("vendor", "admin"),
  acceptVendorDeliveryLocationRecommendation
);
router.post(
  "/delivery-location-recommendations/:recommendationId/ignore",
  authenticate,
  requireRole("vendor", "admin"),
  ignoreVendorDeliveryLocationRecommendation
);
router.patch("/delivery-locations/:locationId", authenticate, requireRole("vendor", "admin"), updateVendorDeliveryLocation);
router.delete("/delivery-locations/:locationId", authenticate, requireRole("vendor", "admin"), deleteVendorDeliveryLocation);
router.put("/:id/service-areas", authenticate, requireRole("vendor", "admin"), updateVendorServiceAreas);
router.get("/:id/orders", authenticate, requireRole("vendor", "admin"), getVendorOrders);
router.get("/:id/profile", authenticate, requireRole("vendor", "admin"), getVendorProfile);
router.patch("/:id/profile", authenticate, requireRole("vendor", "admin"), updateVendorProfile);
router.patch("/:id/verification", authenticate, requireRole("admin"), updateVendorVerificationStatus);
router.get("/menu/review", authenticate, requireRole("admin"), getAdminMenuReview);
router.patch("/menu/:itemId/verification", authenticate, requireRole("admin"), updateMenuVerificationStatus);
router.get("/:id/earnings", authenticate, requireRole("vendor", "admin"), getVendorEarnings);
router.get("/:id/menu", authenticate, requireRole("vendor", "admin"), getVendorMenu);
router.post("/:id/menu", authenticate, requireRole("vendor", "admin"), createVendorMenuItem);
router.patch("/:id/toggle", authenticate, requireRole("admin"), toggleVendor);
router.put("/menu/:itemId", authenticate, requireRole("vendor", "admin"), updateVendorMenuItem);
router.delete("/menu/:itemId", authenticate, requireRole("vendor", "admin"), deleteVendorMenuItem);

export default router;
