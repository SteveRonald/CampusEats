import { Router } from "express";
import {
  getAdminOrders,
  getAdminSummary,
  getCategories,
  getMarketplaceFeed,
  getOrder,
  getPopularMeals,
  listStudentOrders,
  updateOrderStatus,
  getOrdersReport
} from "../controllers/ordersController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/marketplace/feed", getMarketplaceFeed);
router.get("/marketplace/popular", getPopularMeals);
router.get("/marketplace/categories", getCategories);
router.get("/admin/summary", authenticate, requireRole("admin"), getAdminSummary);
router.get("/admin/list", authenticate, requireRole("admin"), getAdminOrders);
router.get("/admin/reports", authenticate, requireRole("admin"), getOrdersReport);
router.get("/", authenticate, requireRole("student"), listStudentOrders);
router.get("/:id", authenticate, getOrder);
router.patch("/:id/status", authenticate, updateOrderStatus);

export default router;
