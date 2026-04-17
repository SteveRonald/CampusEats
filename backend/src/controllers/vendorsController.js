import { query } from "../db/client.js";
import { hydrateOrders } from "./helpers.js";

async function ensureVendorDeliveryLocationConfigured(vendorId) {
  const result = await query(
    `SELECT 1
     FROM vendor_delivery_locations
     WHERE vendor_id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows.length > 0;
}

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
              v.pickup_time_min, v.pickup_time_max, u.phone AS student_phone,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       LEFT JOIN users u ON u.id = o.student_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
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

export async function getVendorDeliveryLocations(req, res) {
  try {
    const vendorId = Number(req.params.id);
    const serviceAreaId = req.query.serviceAreaId ? Number(req.query.serviceAreaId) : null;

    if (req.user?.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const values = [vendorId];
    const conditions = ["vendor_id = $1"];

    if (serviceAreaId) {
      values.push(serviceAreaId);
      conditions.push(`service_area_id = $${values.length}`);
    }

    const result = await query(
      `SELECT vdl.id, vdl.vendor_id, vdl.service_area_id, sa.name AS service_area_name, vdl.label, vdl.location, vdl.is_default
       FROM vendor_delivery_locations vdl
       LEFT JOIN service_areas sa ON sa.id = vdl.service_area_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY vdl.is_default DESC, vdl.label ASC`,
      values
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor delivery locations" });
  }
}

export async function getVendorDeliveryLocationRecommendations(req, res) {
  try {
    const vendorId = Number(req.params.id);

    if (req.user?.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await query(
      `WITH candidate AS (
         SELECT
           o.id AS source_order_id,
           o.vendor_id,
           COALESCE(NULLIF(o.delivery_details->>'serviceAreaId', '')::int, o.service_area_id) AS service_area_id,
           BTRIM(o.delivery_details->>'otherLocationName') AS place_name,
           BTRIM(o.delivery_details->>'otherLocationDetails') AS place_details
         FROM orders o
         WHERE o.vendor_id = $1
           AND o.order_type = 'delivery'
           AND o.delivery_details->>'mode' = 'other'
       )
       INSERT INTO vendor_delivery_location_recommendations (vendor_id, source_order_id, service_area_id, place_name, place_details)
       SELECT c.vendor_id, c.source_order_id, c.service_area_id, c.place_name, c.place_details
       FROM candidate c
       WHERE c.place_name IS NOT NULL
         AND c.place_details IS NOT NULL
         AND c.place_name <> ''
         AND c.place_details <> ''
         AND NOT EXISTS (
           SELECT 1
           FROM vendor_delivery_location_recommendations vdr
           WHERE vdr.vendor_id = c.vendor_id
             AND ((vdr.service_area_id IS NULL AND c.service_area_id IS NULL) OR vdr.service_area_id = c.service_area_id)
             AND LOWER(vdr.place_name) = LOWER(c.place_name)
             AND LOWER(vdr.place_details) = LOWER(c.place_details)
         )`,
      [vendorId]
    );

    const result = await query(
      `SELECT vdr.id, vdr.vendor_id, vdr.source_order_id, vdr.service_area_id, sa.name AS service_area_name,
              vdr.place_name, vdr.place_details, vdr.status, vdr.accepted_location_id, vdr.reviewed_at, vdr.created_at
       FROM vendor_delivery_location_recommendations vdr
       LEFT JOIN service_areas sa ON sa.id = vdr.service_area_id
       WHERE vdr.vendor_id = $1 AND vdr.status = 'pending'
       ORDER BY vdr.created_at DESC`,
      [vendorId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch delivery recommendations" });
  }
}

export async function acceptVendorDeliveryLocationRecommendation(req, res) {
  try {
    const recommendationId = Number(req.params.recommendationId);
    const current = await query(
      `SELECT *
       FROM vendor_delivery_location_recommendations
       WHERE id = $1
       LIMIT 1`,
      [recommendationId]
    );

    if (!current.rows.length) {
      return res.status(404).json({ error: "Delivery recommendation not found" });
    }

    const recommendation = current.rows[0];

    if (req.user?.role === "vendor" && req.user.vendorId !== recommendation.vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (recommendation.status !== "pending") {
      return res.status(400).json({ error: "Recommendation has already been reviewed" });
    }

    const requestedServiceAreaId = Number(req.body.serviceAreaId);
    const serviceAreaId = Number.isFinite(requestedServiceAreaId) && requestedServiceAreaId > 0 ? requestedServiceAreaId : recommendation.service_area_id;

    if (!serviceAreaId) {
      return res.status(400).json({ error: "A service area is required to accept this recommendation" });
    }

    const allowed = await query(
      `SELECT 1
       FROM vendor_service_areas
       WHERE vendor_id = $1 AND service_area_id = $2
       LIMIT 1`,
      [recommendation.vendor_id, serviceAreaId]
    );

    if (!allowed.rows.length) {
      return res.status(400).json({ error: "Service area is not assigned to this vendor" });
    }

    const existingLocation = await query(
      `SELECT id
       FROM vendor_delivery_locations
       WHERE vendor_id = $1
         AND service_area_id = $2
         AND LOWER(label) = LOWER($3)
         AND LOWER(location) = LOWER($4)
       LIMIT 1`,
      [recommendation.vendor_id, serviceAreaId, recommendation.place_name, recommendation.place_details]
    );

    let acceptedLocationId = existingLocation.rows[0]?.id ?? null;

    if (!acceptedLocationId) {
      const insertedLocation = await query(
        `INSERT INTO vendor_delivery_locations (vendor_id, service_area_id, label, location, is_default)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [recommendation.vendor_id, serviceAreaId, recommendation.place_name, recommendation.place_details]
      );
      acceptedLocationId = insertedLocation.rows[0].id;
    }

    await query(
      `UPDATE vendor_delivery_location_recommendations
       SET status = 'accepted', service_area_id = $2, accepted_location_id = $3, reviewed_at = NOW()
       WHERE id = $1`,
      [recommendationId, serviceAreaId, acceptedLocationId]
    );

    res.json({ success: true, acceptedLocationId });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept delivery recommendation" });
  }
}

export async function ignoreVendorDeliveryLocationRecommendation(req, res) {
  try {
    const recommendationId = Number(req.params.recommendationId);
    const current = await query(
      `SELECT vendor_id, status
       FROM vendor_delivery_location_recommendations
       WHERE id = $1
       LIMIT 1`,
      [recommendationId]
    );

    if (!current.rows.length) {
      return res.status(404).json({ error: "Delivery recommendation not found" });
    }

    if (req.user?.role === "vendor" && req.user.vendorId !== current.rows[0].vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (current.rows[0].status !== "pending") {
      return res.status(400).json({ error: "Recommendation has already been reviewed" });
    }

    await query(
      `UPDATE vendor_delivery_location_recommendations
       SET status = 'ignored', reviewed_at = NOW()
       WHERE id = $1`,
      [recommendationId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to ignore delivery recommendation" });
  }
}

export async function getVendorServiceAreas(req, res) {
  try {
    const vendorId = Number(req.params.id);

    if (req.user?.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      `SELECT sa.id, sa.name, sa.is_active, COALESCE(vsa.vendor_id IS NOT NULL, false) AS selected
       FROM service_areas sa
       LEFT JOIN vendor_service_areas vsa
         ON vsa.service_area_id = sa.id AND vsa.vendor_id = $1
       ORDER BY sa.name ASC`,
      [vendorId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendor service areas" });
  }
}

export async function updateVendorServiceAreas(req, res) {
  try {
    const vendorId = Number(req.params.id);

    if (req.user?.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const serviceAreaIds = Array.isArray(req.body.serviceAreaIds) ? req.body.serviceAreaIds.map((value) => Number(value)).filter(Boolean) : [];

    await query(`DELETE FROM vendor_service_areas WHERE vendor_id = $1`, [vendorId]);
    for (const serviceAreaId of serviceAreaIds) {
      await query(`INSERT INTO vendor_service_areas (vendor_id, service_area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [vendorId, serviceAreaId]);
    }

    const result = await query(
      `SELECT sa.id, sa.name, sa.is_active, COALESCE(vsa.vendor_id IS NOT NULL, false) AS selected
       FROM service_areas sa
       LEFT JOIN vendor_service_areas vsa
         ON vsa.service_area_id = sa.id AND vsa.vendor_id = $1
       ORDER BY sa.name ASC`,
      [vendorId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to update vendor service areas" });
  }
}

export async function createVendorDeliveryLocation(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user?.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const label = String(req.body.label ?? "").trim();
    const location = String(req.body.location ?? "").trim();
    const serviceAreaId = Number(req.body.serviceAreaId);
    const isDefault = Boolean(req.body.isDefault);

    if (!label || !location || !serviceAreaId) {
      return res.status(400).json({ error: "Label, location, and service area are required" });
    }

    const allowed = await query(`SELECT 1 FROM vendor_service_areas WHERE vendor_id = $1 AND service_area_id = $2 LIMIT 1`, [vendorId, serviceAreaId]);
    if (!allowed.rows.length) {
      return res.status(400).json({ error: "Service area is not assigned to this vendor" });
    }

    const result = await query(
      `INSERT INTO vendor_delivery_locations (vendor_id, service_area_id, label, location, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vendorId, serviceAreaId, label, location, isDefault]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create pickup location" });
  }
}

export async function updateVendorDeliveryLocation(req, res) {
  try {
    const locationId = Number(req.params.locationId);
    const current = await query(`SELECT * FROM vendor_delivery_locations WHERE id = $1`, [locationId]);

    if (!current.rows.length) {
      return res.status(404).json({ error: "Pickup location not found" });
    }

    if (req.user?.role === "vendor" && req.user.vendorId !== current.rows[0].vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const label = String(req.body.label ?? current.rows[0].label).trim();
    const location = String(req.body.location ?? current.rows[0].location).trim();
    const serviceAreaId = Number(req.body.serviceAreaId ?? current.rows[0].service_area_id);
    const isDefault = typeof req.body.isDefault === "boolean" ? req.body.isDefault : current.rows[0].is_default;

    const allowed = await query(`SELECT 1 FROM vendor_service_areas WHERE vendor_id = $1 AND service_area_id = $2 LIMIT 1`, [current.rows[0].vendor_id, serviceAreaId]);
    if (!allowed.rows.length) {
      return res.status(400).json({ error: "Service area is not assigned to this vendor" });
    }

    const result = await query(
      `UPDATE vendor_delivery_locations
       SET label = $2, location = $3, service_area_id = $4, is_default = $5
       WHERE id = $1
       RETURNING *`,
      [locationId, label, location, serviceAreaId, isDefault]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update pickup location" });
  }
}

export async function deleteVendorDeliveryLocation(req, res) {
  try {
    const locationId = Number(req.params.locationId);
    const current = await query(`SELECT vendor_id FROM vendor_delivery_locations WHERE id = $1`, [locationId]);

    if (!current.rows.length) {
      return res.status(404).json({ error: "Pickup location not found" });
    }

    if (req.user?.role === "vendor" && req.user.vendorId !== current.rows[0].vendor_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await query(`DELETE FROM vendor_delivery_locations WHERE id = $1`, [locationId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete pickup location" });
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

    if (req.user.role === "vendor") {
      const configured = await ensureVendorDeliveryLocationConfigured(vendorId);
      if (!configured) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
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

    if (req.user.role === "vendor") {
      const configured = await ensureVendorDeliveryLocationConfigured(current.rows[0].vendor_id);
      if (!configured) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
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

    if (req.user.role === "vendor") {
      const configured = await ensureVendorDeliveryLocationConfigured(current.rows[0].vendor_id);
      if (!configured) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
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
