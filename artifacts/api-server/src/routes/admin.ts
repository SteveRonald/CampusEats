import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, vendorsTable, transactionsTable, orderItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/admin/stats", async (req, res) => {
  try {
    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable);

    const [totalVendors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendorsTable);

    const [activeVendors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendorsTable)
      .where(eq(vendorsTable.isActive, true));

    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "completed"));

    const [commission] = await db
      .select({ total: sql<number>`coalesce(sum(${transactionsTable.commission}), 0)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.status, "completed"));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(sql`${ordersTable.createdAt} >= ${today.toISOString()}`);

    res.json({
      totalOrders: Number(totalOrders?.count || 0),
      totalVendors: Number(totalVendors?.count || 0),
      activeVendors: Number(activeVendors?.count || 0),
      totalRevenue: Number(revenue?.total || 0),
      totalCommission: Number(commission?.total || 0),
      ordersToday: Number(ordersToday?.count || 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.get("/admin/orders", async (req, res) => {
  try {
    const { status, limit = 50 } = req.query as Record<string, string>;

    const orders = status
      ? await db
          .select()
          .from(ordersTable)
          .where(sql`${ordersTable.status} = ${status}`)
          .orderBy(sql`${ordersTable.createdAt} DESC`)
          .limit(Number(limit))
      : await db
          .select()
          .from(ordersTable)
          .orderBy(sql`${ordersTable.createdAt} DESC`)
          .limit(Number(limit));

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) {
      res.json([]);
      return;
    }

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(sql`${orderItemsTable.orderId} = ANY(${orderIds})`);

    const vendorIds = [...new Set(orders.map((o) => o.vendorId))];
    const vendors = await db
      .select()
      .from(vendorsTable)
      .where(sql`${vendorsTable.id} = ANY(${vendorIds})`);

    const result = orders.map((order) => ({
      ...order,
      items: items.filter((i) => i.orderId === order.id),
      vendor: vendors.find((v) => v.id === order.vendorId) || null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.put("/admin/vendors/:id/toggle", async (req, res) => {
  try {
    const vendorId = Number(req.params.id);
    const [current] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!current) return res.status(404).json({ error: "Vendor not found" });

    const [vendor] = await db
      .update(vendorsTable)
      .set({ isActive: !current.isActive })
      .where(eq(vendorsTable.id, vendorId))
      .returning();

    res.json(vendor);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to toggle vendor status" });
  }
});

export default router;
