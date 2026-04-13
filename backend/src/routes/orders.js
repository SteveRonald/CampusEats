import { Router } from "express";
import {
  getAdminOrders,
  getAdminSummary,
  getCategories,
  getMarketplaceFeed,
  getOrder,
  getPopularMeals,
  listStudentOrders,
  updateOrderStatus
} from "../controllers/ordersController.js";

const router = Router();

router.get("/marketplace/feed", getMarketplaceFeed);
router.get("/marketplace/popular", getPopularMeals);
router.get("/marketplace/categories", getCategories);
router.get("/admin/summary", getAdminSummary);
router.get("/admin/list", getAdminOrders);
router.get("/", listStudentOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);

export default router;
