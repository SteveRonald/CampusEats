import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/menu", async (req, res) => {
  try {
    const { vendor_id, category, is_available } = req.query as Record<string, string>;

    let query = db.select().from(menuItemsTable);
    const conditions = [];
    if (vendor_id) conditions.push(eq(menuItemsTable.vendorId, Number(vendor_id)));
    if (category) conditions.push(eq(menuItemsTable.category, category));
    if (is_available !== undefined) conditions.push(eq(menuItemsTable.isAvailable, is_available === "true"));

    const items = conditions.length
      ? await db.select().from(menuItemsTable).where(and(...conditions))
      : await db.select().from(menuItemsTable);

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

router.post("/menu", async (req, res) => {
  try {
    const { vendorId, name, description, price, category, imageUrl, isAvailable = true } = req.body;
    if (!vendorId || !name || !price || !category) {
      return res.status(400).json({ error: "vendorId, name, price, category required" });
    }

    const [item] = await db
      .insert(menuItemsTable)
      .values({ vendorId: Number(vendorId), name, description, price: String(price), category, imageUrl, isAvailable })
      .returning();

    res.status(201).json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

router.get("/menu/:id", async (req, res) => {
  try {
    const [item] = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, Number(req.params.id)));

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch menu item" });
  }
});

router.put("/menu/:id", async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, isAvailable } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = String(price);
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const [item] = await db
      .update(menuItemsTable)
      .set(updates)
      .where(eq(menuItemsTable.id, Number(req.params.id)))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

router.delete("/menu/:id", async (req, res) => {
  try {
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, Number(req.params.id)));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

export default router;
