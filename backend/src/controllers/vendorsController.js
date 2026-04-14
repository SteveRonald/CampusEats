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
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max, u.phone AS student_phone
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       LEFT JOIN users u ON u.id = o.student_id
       WHERE o.vendor_id = $1
       ORDER BY o.created_at DESC`,
      [vendorId]
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor orders" });
  }
}

export async function getVendorProfile(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      `SELECT v.id, v.user_id, v.stall_name, v.description, v.mpesa_number, v.image_url, v.location,
              v.pickup_time_min, v.pickup_time_max, v.is_active,
              u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM vendors v
       INNER JOIN users u ON u.id = v.user_id
       WHERE v.id = $1
       LIMIT 1`,
      [vendorId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor profile" });
  }
}

export async function updateVendorProfile(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const existing = await query(
      `SELECT v.id, v.user_id
       FROM vendors v
       WHERE v.id = $1
       LIMIT 1`,
      [vendorId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const { ownerName, ownerEmail, ownerPhone, stallName, description, mpesaNumber, location, pickupTimeMin, pickupTimeMax } = req.body;

    if (!ownerName || !ownerEmail || !stallName || !mpesaNumber) {
      return res.status(400).json({ error: "Owner name, owner email, stall name, and M-Pesa number are required" });
    }

    const duplicate = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [ownerEmail, existing.rows[0].user_id]
    );
    if (duplicate.rows.length) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    await query(
      `UPDATE users
       SET name = $2, email = $3, phone = $4
       WHERE id = $1`,
      [existing.rows[0].user_id, String(ownerName).trim(), String(ownerEmail).trim(), ownerPhone ? String(ownerPhone).trim() : null]
    );

    await query(
      `UPDATE vendors
       SET stall_name = $2,
           description = $3,
           mpesa_number = $4,
           location = $5,
           pickup_time_min = $6,
           pickup_time_max = $7
       WHERE id = $1`,
      [
        vendorId,
        String(stallName).trim(),
        description ? String(description).trim() : null,
        String(mpesaNumber).trim(),
        location ? String(location).trim() : null,
        Number(pickupTimeMin) || 10,
        Number(pickupTimeMax) || 15
      ]
    );

    const refreshed = await query(
      `SELECT v.id, v.user_id, v.stall_name, v.description, v.mpesa_number, v.image_url, v.location,
              v.pickup_time_min, v.pickup_time_max, v.is_active,
              u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM vendors v
       INNER JOIN users u ON u.id = v.user_id
       WHERE v.id = $1
       LIMIT 1`,
      [vendorId]
    );

    return res.json(refreshed.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update vendor profile" });
  }
}

export async function getVendorEarnings(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      `SELECT * FROM menu_items WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
}

export async function createVendorMenuItem(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, description, price, category, imageUrl } = req.body;
    const result = await query(
      `INSERT INTO menu_items (vendor_id, name, description, price, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [vendorId, name, description || null, Number(price), category, imageUrl || null]
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

    if (req.user.role === "vendor" && req.user.vendorId !== current.rows[0].vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
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
    const current = await query(`SELECT vendor_id FROM menu_items WHERE id = $1`, [Number(req.params.itemId)]);
    if (!current.rows.length) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    if (req.user.role === "vendor" && req.user.vendorId !== current.rows[0].vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
