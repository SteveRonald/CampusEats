import { query } from "../db/client.js";
import { hydrateOrders } from "./helpers.js";

export async function getMarketplaceFeed(req, res) {
  try {
    const { category, search } = req.query;
    const values = [];
    const conditions = ["m.is_available = true", "v.is_active = true"];

    if (category) {
      values.push(category);
      conditions.push(`m.category = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`m.name ILIKE $${values.length}`);
    }

    const itemsResult = await query(
      `SELECT m.id, m.vendor_id, m.name, m.description, m.price, m.category, m.image_url, m.is_available,
              m.order_count, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY m.order_count DESC, m.created_at DESC`,
      values
    );

    const statsResult = await query(
      `SELECT
         (SELECT COUNT(*) FROM menu_items WHERE is_available = true)::int AS "totalItems",
         (SELECT COUNT(*) FROM vendors WHERE is_active = true)::int AS "totalVendors",
         COALESCE((SELECT ROUND(AVG((pickup_time_min + pickup_time_max) / 2.0)) FROM vendors WHERE is_active = true), 12)::int AS "avgPickupTime"`
    );

    res.json({ items: itemsResult.rows, stats: statsResult.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch marketplace feed" });
  }
}

export async function getPopularMeals(_req, res) {
  try {
    const result = await query(
      `SELECT m.id, m.vendor_id, m.name, m.description, m.price, m.category, m.image_url, m.is_available,
              m.order_count, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE m.is_available = true AND v.is_active = true
       ORDER BY m.order_count DESC, m.created_at DESC
       LIMIT 8`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch popular meals" });
  }
}

export async function getCategories(_req, res) {
  try {
    const result = await query(
      `SELECT DISTINCT category
       FROM menu_items
       WHERE is_available = true
       ORDER BY category ASC`
    );
    res.json(result.rows.map((row) => row.category));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}

export async function listStudentOrders(req, res) {
  try {
    const { studentId } = req.query;
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       WHERE ($1::int IS NULL OR o.student_id = $1)
       ORDER BY o.created_at DESC`,
      [studentId ? Number(studentId) : null]
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

export async function getOrder(req, res) {
  try {
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       WHERE o.id = $1`,
      [Number(req.params.id)]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const [order] = await hydrateOrders(result.rows);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE orders
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [Number(req.params.id), status]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const fullOrder = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       WHERE o.id = $1`,
      [Number(req.params.id)]
    );

    const [order] = await hydrateOrders(fullOrder.rows);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
}

export async function getAdminSummary(_req, res) {
  try {
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM orders)::int AS "totalOrders",
         (SELECT COUNT(*) FROM vendors WHERE is_active = true)::int AS "activeVendors",
         (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE)::int AS "ordersToday",
         COALESCE((SELECT SUM(amount) FROM transactions WHERE status IN ('paid', 'completed')), 0)::numeric AS "totalRevenue",
         COALESCE((SELECT SUM(commission) FROM transactions WHERE status IN ('paid', 'completed')), 0)::numeric AS "totalCommission",
         (SELECT COUNT(*) FROM transactions WHERE created_at::date = CURRENT_DATE)::int AS "transactionsToday"`
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin summary" });
  }
}

export async function getAdminOrders(_req, res) {
  try {
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       ORDER BY o.created_at DESC`
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
}
