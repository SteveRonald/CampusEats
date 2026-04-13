import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable, ordersTable, orderItemsTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/vendors", async (req, res) => {
  try {
    const vendors = await db.select().from(vendorsTable);
    res.json(vendors);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { userId, stallName, description, mpesaNumber, imageUrl, location, pickupTimeMin = 10, pickupTimeMax = 15 } = req.body;
    if (!stallName || !mpesaNumber) {
      return res.status(400).json({ error: "stallName and mpesaNumber required" });
    }
    const [vendor] = await db
      .insert(vendorsTable)
      .values({ userId, stallName, description, mpesaNumber, imageUrl, location, pickupTimeMin, pickupTimeMax })
      .returning();
    res.status(201).json(vendor);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, Number(req.params.id)));
    if (!vendor) return res.status(404).json({ error: "Not found" });
    res.json(vendor);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.put("/vendors/:id", async (req, res) => {
  try {
    const { stallName, description, mpesaNumber, imageUrl, location, isActive, pickupTimeMin, pickupTimeMax } = req.body;
    const updates: Record<string, unknown> = {};
    if (stallName !== undefined) updates.stallName = stallName;
    if (description !== undefined) updates.description = description;
    if (mpesaNumber !== undefined) updates.mpesaNumber = mpesaNumber;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (location !== undefined) updates.location = location;
    if (isActive !== undefined) updates.isActive = isActive;
    if (pickupTimeMin !== undefined) updates.pickupTimeMin = pickupTimeMin;
    if (pickupTimeMax !== undefined) updates.pickupTimeMax = pickupTimeMax;

    const [vendor] = await db
      .update(vendorsTable)
      .set(updates)
      .where(eq(vendorsTable.id, Number(req.params.id)))
      .returning();

    if (!vendor) return res.status(404).json({ error: "Not found" });
    res.json(vendor);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.get("/vendors/:id/stats", async (req, res) => {
  try {
    const vendorId = Number(req.params.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.vendorId, vendorId));

    const [ordersToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), sql`${ordersTable.createdAt} >= ${today.toISOString()}`));

    const [earnings] = await db
      .select({ total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.status, "completed")));

    const [earningsToday] = await db
      .select({ total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)` })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.vendorId, vendorId),
          eq(ordersTable.status, "completed"),
          sql`${ordersTable.createdAt} >= ${today.toISOString()}`,
        ),
      );

    const [pendingOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), sql`${ordersTable.status} IN ('paid', 'preparing')`));

    const [completedOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.status, "completed")));

    res.json({
      totalOrders: Number(totalOrders?.count || 0),
      ordersToday: Number(ordersToday?.count || 0),
      totalEarnings: Number(earnings?.total || 0),
      earningsToday: Number(earningsToday?.total || 0),
      pendingOrders: Number(pendingOrders?.count || 0),
      completedOrders: Number(completedOrders?.count || 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendor stats" });
  }
});

router.get("/vendors/:id/orders", async (req, res) => {
  try {
    const vendorId = Number(req.params.id);
    const { status } = req.query as { status?: string };

    const conditions = [eq(ordersTable.vendorId, vendorId)];
    if (status) conditions.push(sql`${ordersTable.status} = ${status}`);

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(sql`${ordersTable.createdAt} DESC`);

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) {
      res.json([]);
      return;
    }

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(sql`${orderItemsTable.orderId} IN ${orderIds}`);

    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));

    const result = orders.map((order) => ({
      ...order,
      items: items.filter((i) => i.orderId === order.id),
      vendor,
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendor orders" });
  }
});

export default router;
