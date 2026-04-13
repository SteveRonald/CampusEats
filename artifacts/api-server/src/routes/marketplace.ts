import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable, vendorsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  GetMarketplaceFeedQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/marketplace/feed", async (req, res) => {
  try {
    const { category, search, limit = 40, offset = 0 } = req.query as Record<string, string>;

    const conditions = [eq(menuItemsTable.isAvailable, true), eq(vendorsTable.isActive, true)];
    if (category) conditions.push(eq(menuItemsTable.category, category));
    if (search) conditions.push(ilike(menuItemsTable.name, `%${search}%`));

    const items = await db
      .select({
        id: menuItemsTable.id,
        vendorId: menuItemsTable.vendorId,
        name: menuItemsTable.name,
        description: menuItemsTable.description,
        price: menuItemsTable.price,
        category: menuItemsTable.category,
        imageUrl: menuItemsTable.imageUrl,
        isAvailable: menuItemsTable.isAvailable,
        orderCount: menuItemsTable.orderCount,
        createdAt: menuItemsTable.createdAt,
        vendor: {
          id: vendorsTable.id,
          userId: vendorsTable.userId,
          stallName: vendorsTable.stallName,
          description: vendorsTable.description,
          mpesaNumber: vendorsTable.mpesaNumber,
          isActive: vendorsTable.isActive,
          imageUrl: vendorsTable.imageUrl,
          location: vendorsTable.location,
          pickupTimeMin: vendorsTable.pickupTimeMin,
          pickupTimeMax: vendorsTable.pickupTimeMax,
          createdAt: vendorsTable.createdAt,
        },
      })
      .from(menuItemsTable)
      .innerJoin(vendorsTable, eq(menuItemsTable.vendorId, vendorsTable.id))
      .where(and(...conditions))
      .limit(Number(limit))
      .offset(Number(offset));

    const total = items.length;

    res.json({ items, total });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch marketplace feed" });
  }
});

router.get("/marketplace/popular", async (req, res) => {
  try {
    const items = await db
      .select({
        id: menuItemsTable.id,
        vendorId: menuItemsTable.vendorId,
        name: menuItemsTable.name,
        description: menuItemsTable.description,
        price: menuItemsTable.price,
        category: menuItemsTable.category,
        imageUrl: menuItemsTable.imageUrl,
        isAvailable: menuItemsTable.isAvailable,
        orderCount: menuItemsTable.orderCount,
        createdAt: menuItemsTable.createdAt,
        vendor: {
          id: vendorsTable.id,
          userId: vendorsTable.userId,
          stallName: vendorsTable.stallName,
          description: vendorsTable.description,
          mpesaNumber: vendorsTable.mpesaNumber,
          isActive: vendorsTable.isActive,
          imageUrl: vendorsTable.imageUrl,
          location: vendorsTable.location,
          pickupTimeMin: vendorsTable.pickupTimeMin,
          pickupTimeMax: vendorsTable.pickupTimeMax,
          createdAt: vendorsTable.createdAt,
        },
      })
      .from(menuItemsTable)
      .innerJoin(vendorsTable, eq(menuItemsTable.vendorId, vendorsTable.id))
      .where(and(eq(menuItemsTable.isAvailable, true), eq(vendorsTable.isActive, true)))
      .orderBy(sql`${menuItemsTable.orderCount} DESC`)
      .limit(8);

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch popular items" });
  }
});

router.get("/marketplace/categories", async (req, res) => {
  try {
    const result = await db
      .selectDistinct({ category: menuItemsTable.category })
      .from(menuItemsTable)
      .where(eq(menuItemsTable.isAvailable, true));

    const categories = result.map((r) => r.category).filter(Boolean);
    res.json(categories);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/marketplace/stats", async (req, res) => {
  try {
    const [itemsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(menuItemsTable)
      .where(eq(menuItemsTable.isAvailable, true));

    const [vendorsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendorsTable)
      .where(eq(vendorsTable.isActive, true));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`${ordersTable.createdAt} >= ${today.toISOString()}`);

    res.json({
      totalItems: Number(itemsCount?.count || 0),
      totalVendors: Number(vendorsCount?.count || 0),
      ordersToday: Number(ordersToday?.count || 0),
      avgPickupTime: 12,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
