import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, menuItemsTable, vendorsTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function generatePickupCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

router.get("/orders", async (req, res) => {
  try {
    const { student_id, status } = req.query as Record<string, string>;
    const conditions = [];
    if (student_id) conditions.push(eq(ordersTable.studentId, Number(student_id)));
    if (status) conditions.push(sql`${ordersTable.status} = ${status}`);

    const orders = conditions.length
      ? await db.select().from(ordersTable).where(and(...conditions)).orderBy(sql`${ordersTable.createdAt} DESC`)
      : await db.select().from(ordersTable).orderBy(sql`${ordersTable.createdAt} DESC`);

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

router.post("/orders", async (req, res) => {
  try {
    const { studentId, vendorId, items, notes, studentName } = req.body;
    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "vendorId and items required" });
    }

    const menuItems = await db
      .select()
      .from(menuItemsTable)
      .where(sql`${menuItemsTable.id} = ANY(${items.map((i: { menuItemId: number }) => i.menuItemId)})`);

    let totalAmount = 0;
    const orderItemsData = items.map((item: { menuItemId: number; quantity: number }) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
      const unitPrice = Number(menuItem.price);
      totalAmount += unitPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: String(unitPrice),
      };
    });

    const [order] = await db
      .insert(ordersTable)
      .values({
        studentId: studentId ? Number(studentId) : null,
        vendorId: Number(vendorId),
        studentName: studentName || "Student",
        status: "paid",
        totalAmount: String(totalAmount),
        pickupCode: generatePickupCode(),
        notes,
      })
      .returning();

    const insertedItems = await db
      .insert(orderItemsTable)
      .values(orderItemsData.map((item) => ({ ...item, orderId: order.id })))
      .returning();

    const commission = totalAmount * 0.1;
    const vendorPayout = totalAmount * 0.9;

    await db.insert(transactionsTable).values({
      orderId: order.id,
      amount: String(totalAmount),
      commission: String(commission),
      vendorPayout: String(vendorPayout),
      status: "completed",
    });

    await Promise.all(
      items.map((item: { menuItemId: number; quantity: number }) =>
        db
          .update(menuItemsTable)
          .set({ orderCount: sql`${menuItemsTable.orderCount} + ${item.quantity}` })
          .where(eq(menuItemsTable.id, item.menuItemId)),
      ),
    );

    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));

    res.status(201).json({
      ...order,
      items: insertedItems,
      vendor,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/student/:studentId/recent", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.studentId, studentId))
      .orderBy(sql`${ordersTable.createdAt} DESC`)
      .limit(5);

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
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: "Not found" });

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));

    res.json({ ...order, items, vendor });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const [order] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, Number(req.params.id)))
      .returning();

    if (!order) return res.status(404).json({ error: "Not found" });

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));

    res.json({ ...order, items, vendor });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
