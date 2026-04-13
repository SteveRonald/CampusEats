import { query } from "../db/client.js";
import { hydrateOrders } from "./helpers.js";

export async function listVendors(_req, res) {
  try {
    const result = await query(`SELECT * FROM vendors ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
}

export async function getVendorOrders(req, res) {
  try {
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       WHERE o.vendor_id = $1
       ORDER BY o.created_at DESC`,
      [Number(req.params.id)]
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor orders" });
  }
}

export async function getVendorEarnings(req, res) {
  try {
    const vendorId = Number(req.params.id);
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE vendor_id = $1 AND created_at::date = CURRENT_DATE)::int AS "ordersToday",
         COALESCE((SELECT SUM(total_amount) FROM orders WHERE vendor_id = $1 AND created_at::date = CURRENT_DATE), 0)::numeric AS "earningsToday",
         (SELECT COUNT(*) FROM orders WHERE vendor_id = $1 AND status IN ('paid', 'preparing', 'ready'))::int AS "pendingOrders",
         (SELECT COUNT(*) FROM orders WHERE vendor_id = $1 AND status = 'completed')::int AS "completedOrders",
         COALESCE((SELECT SUM(vendor_payout) FROM transactions t INNER JOIN orders o ON o.id = t.order_id WHERE o.vendor_id = $1), 0)::numeric AS "totalPayout"`,
      [vendorId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor earnings" });
  }
}

export async function getVendorMenu(req, res) {
  try {
    const result = await query(
      `SELECT * FROM menu_items WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [Number(req.params.id)]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
}

export async function createVendorMenuItem(req, res) {
  try {
    const { name, description, price, category, imageUrl } = req.body;
    const result = await query(
      `INSERT INTO menu_items (vendor_id, name, description, price, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [Number(req.params.id), name, description || null, Number(price), category, imageUrl || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create menu item" });
  }
}

export async function updateVendorMenuItem(req, res) {
  try {
    const current = await query(`SELECT * FROM menu_items WHERE id = $1`, [Number(req.params.itemId)]);
    if (!current.rows.length) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const next = { ...current.rows[0], ...req.body };
    const result = await query(
      `UPDATE menu_items
       SET name = $2, description = $3, price = $4, category = $5, image_url = $6, is_available = $7
       WHERE id = $1
       RETURNING *`,
      [Number(req.params.itemId), next.name, next.description, next.price, next.category, next.imageUrl ?? next.image_url, next.isAvailable ?? next.is_available]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update menu item" });
  }
}

export async function deleteVendorMenuItem(req, res) {
  try {
    await query(`DELETE FROM menu_items WHERE id = $1`, [Number(req.params.itemId)]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
}

export async function toggleVendor(req, res) {
  try {
    const result = await query(
      `UPDATE vendors
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING *`,
      [Number(req.params.id)]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle vendor" });
  }
}
