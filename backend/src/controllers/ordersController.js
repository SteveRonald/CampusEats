import { query } from "../db/client.js";
import { hydrateOrders } from "./helpers.js";

function normalizeCategoryKey(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function toCategoryLabel(input) {
  return normalizeCategoryKey(input)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function vendorHasDeliveryLocation(vendorId) {
  const result = await query(
    `SELECT 1
     FROM vendor_delivery_locations
     WHERE vendor_id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows.length > 0;
}

export async function getMarketplaceFeed(req, res) {
  try {
    const { category, search, serviceAreaId } = req.query;
    const values = [];
    const conditions = [
      "m.is_available = true",
      "COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) = 'approved'",
      "v.is_active = true",
      "COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) = 'approved'",
      "NULLIF(BTRIM(COALESCE(v.location_proof_image_url, '')), '') IS NOT NULL"
    ];

    if (category) {
      values.push(normalizeCategoryKey(category));
      conditions.push(`LOWER(REGEXP_REPLACE(BTRIM(m.category), '\\s+', ' ', 'g')) = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(m.name ILIKE $${values.length} OR m.category ILIKE $${values.length} OR v.stall_name ILIKE $${values.length})`);
    }

    if (serviceAreaId) {
      values.push(Number(serviceAreaId));
      conditions.push(`EXISTS (SELECT 1 FROM vendor_service_areas vsa WHERE vsa.vendor_id = v.id AND vsa.service_area_id = $${values.length})`);
    }

    const itemsResult = await query(
      `SELECT m.id, m.vendor_id, m.name, m.description, m.price, m.category, m.image_url, m.is_available,
              m.order_count, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.image_url AS vendor_image_url, v.pickup_time_min, v.pickup_time_max,
              v.order_start_time AS vendor_order_start_time,
              v.order_end_time AS vendor_order_end_time,
              CASE
                WHEN v.order_start_time = v.order_end_time THEN true
                WHEN v.order_start_time < v.order_end_time THEN (timezone('Africa/Nairobi', NOW())::time >= v.order_start_time AND timezone('Africa/Nairobi', NOW())::time < v.order_end_time)
                ELSE (timezone('Africa/Nairobi', NOW())::time >= v.order_start_time OR timezone('Africa/Nairobi', NOW())::time < v.order_end_time)
              END AS vendor_accepting_orders
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY m.order_count DESC, m.created_at DESC`,
      values
    );

    const uniqueVendors = new Set(itemsResult.rows.map((item) => item.vendor_id));
    const avgPickupTime = itemsResult.rows.length
      ? Math.round(
          itemsResult.rows.reduce((sum, item) => sum + ((Number(item.pickup_time_min) + Number(item.pickup_time_max)) / 2), 0) / itemsResult.rows.length
        )
      : 12;

    res.json({
      items: itemsResult.rows,
      stats: {
        totalItems: itemsResult.rows.length,
        totalVendors: uniqueVendors.size,
        avgPickupTime
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch marketplace feed" });
  }
}

export async function getPopularMeals(_req, res) {
  try {
    const result = await query(
      `SELECT m.id, m.vendor_id, m.name, m.description, m.price, m.category, m.image_url, m.is_available,
              m.order_count, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.image_url AS vendor_image_url, v.pickup_time_min, v.pickup_time_max,
              v.order_start_time AS vendor_order_start_time,
              v.order_end_time AS vendor_order_end_time,
              CASE
                WHEN v.order_start_time = v.order_end_time THEN true
                WHEN v.order_start_time < v.order_end_time THEN (timezone('Africa/Nairobi', NOW())::time >= v.order_start_time AND timezone('Africa/Nairobi', NOW())::time < v.order_end_time)
                ELSE (timezone('Africa/Nairobi', NOW())::time >= v.order_start_time OR timezone('Africa/Nairobi', NOW())::time < v.order_end_time)
              END AS vendor_accepting_orders
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE m.is_available = true
         AND COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) = 'approved'
         AND v.is_active = true
         AND COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) = 'approved'
         AND NULLIF(BTRIM(COALESCE(v.location_proof_image_url, '')), '') IS NOT NULL
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
      `SELECT LOWER(REGEXP_REPLACE(BTRIM(m.category), '\\s+', ' ', 'g')) AS category_key
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE m.is_available = true
         AND COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) = 'approved'
         AND v.is_active = true
         AND COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) = 'approved'
         AND NULLIF(BTRIM(COALESCE(v.location_proof_image_url, '')), '') IS NOT NULL
       GROUP BY category_key
       ORDER BY category_key ASC`
    );
    res.json(result.rows.map((row) => toCategoryLabel(row.category_key)).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}

export async function listStudentOrders(req, res) {
  try {
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max, u.phone AS vendor_phone,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       INNER JOIN users u ON u.id = v.user_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
       WHERE o.student_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

export async function getOrder(req, res) {
  try {
    const orderKey = String(req.params.id);
    const isNumericId = /^\d+$/.test(orderKey);
    const result = await query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max, u.phone AS vendor_phone,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       INNER JOIN users u ON u.id = v.user_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
       WHERE ${req.user.role === "student" ? "o.public_id = $1" : isNumericId ? "o.id = $1 OR o.public_id = $1" : "o.public_id = $1"}
       LIMIT 1`,
      [req.user.role === "student" ? orderKey : isNumericId ? Number(orderKey) : orderKey]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderRow = result.rows[0];
    const isOwnerStudent = req.user.role === "student" && orderRow.student_id === req.user.id;
    const isOwnerVendor = req.user.role === "vendor" && orderRow.vendor_id === req.user.vendorId;
    const isAdmin = req.user.role === "admin";

    if (!isOwnerStudent && !isOwnerVendor && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
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
    if (!["preparing", "ready", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const existing = await query(`SELECT id, vendor_id FROM orders WHERE id = $1`, [Number(req.params.id)]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.role === "vendor" && existing.rows[0].vendor_id !== req.user.vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.user.role === "vendor") {
      const verification = await query(
        `SELECT is_active,
                COALESCE(verification_status, CASE WHEN is_active THEN 'approved' ELSE 'pending' END) AS verification_status,
                location_proof_image_url
         FROM vendors
         WHERE id = $1
         LIMIT 1`,
        [req.user.vendorId]
      );

      if (!verification.rows.length) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const vendor = verification.rows[0];
      const hasLocationProof = Boolean(vendor.location_proof_image_url && String(vendor.location_proof_image_url).trim());
      if (!vendor.is_active || vendor.verification_status !== "approved" || !hasLocationProof) {
        return res
          .status(403)
          .json({ error: "Complete admin verification and upload location proof in Business Profile before performing vendor actions." });
      }

      const hasDeliveryLocation = await vendorHasDeliveryLocation(req.user.vendorId);
      if (!hasDeliveryLocation) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
    }

    if (!["vendor", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

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
              v.pickup_time_min, v.pickup_time_max, u.phone AS vendor_phone,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       INNER JOIN users u ON u.id = v.user_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
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
              v.pickup_time_min, v.pickup_time_max, u.phone AS vendor_phone,
              s.phone AS student_phone,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       INNER JOIN users u ON u.id = v.user_id
       LEFT JOIN users s ON s.id = o.student_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
       ORDER BY o.created_at DESC`
    );
    res.json(await hydrateOrders(result.rows));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
}
