import { query } from "../db/client.js";
import { hydrateOrders } from "./helpers.js";

function normalizeCategory(input) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeScheduleTime(input, fallback) {
  const value = String(input ?? fallback ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }
  return value;
}

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

async function ensureVendorApproved(vendorId) {
  const result = await query(
    `SELECT is_active,
            COALESCE(verification_status, CASE WHEN is_active THEN 'approved' ELSE 'pending' END) AS verification_status,
            location_proof_image_url
     FROM vendors
     WHERE id = $1
     LIMIT 1`,
    [vendorId]
  );

  if (!result.rows.length) {
    return { ok: false, status: 404, error: "Vendor not found" };
  }

  const vendor = result.rows[0];
  const isApproved = vendor.is_active && vendor.verification_status === "approved";
  const hasLocationProof = Boolean(vendor.location_proof_image_url && String(vendor.location_proof_image_url).trim());

  if (isApproved) {
    if (!hasLocationProof) {
      return {
        ok: false,
        status: 403,
        error: "Upload a valid location proof image in Business Profile before continuing."
      };
    }

    return { ok: true };
  }

  if (vendor.verification_status === "rejected") {
    return {
      ok: false,
      status: 403,
      error: "Your account verification was rejected. Update your proof details in Business Profile and contact admin."
    };
  }

  return {
    ok: false,
    status: 403,
    error: "Your account is pending admin approval. Complete your verification details in Business Profile."
  };
}

export async function listVendors(_req, res) {
  try {
    const result = await query(
      `SELECT v.id, v.user_id, v.stall_name, v.description, v.mpesa_number, v.image_url, v.location_proof_image_url,
              v.location, v.pickup_time_min, v.pickup_time_max, v.order_start_time, v.order_end_time, v.is_active,
              COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) AS verification_status,
              v.verification_notes, v.verified_at, v.verified_by,
              u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM vendors v
       INNER JOIN users u ON u.id = v.user_id
       ORDER BY v.created_at DESC`
    );
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
              v.location_proof_image_url, v.pickup_time_min, v.pickup_time_max, v.order_start_time, v.order_end_time, v.is_active,
              COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) AS verification_status,
              v.verification_notes, v.verified_at, v.verified_by,
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

    if (req.user?.role === "vendor") {
      const approval = await ensureVendorApproved(vendorId);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
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

    if (req.user?.role === "vendor") {
      const approval = await ensureVendorApproved(vendorId);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
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

    if (req.user?.role === "vendor") {
      const approval = await ensureVendorApproved(current.rows[0].vendor_id);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
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

    if (req.user?.role === "vendor") {
      const approval = await ensureVendorApproved(current.rows[0].vendor_id);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
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

    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      stallName,
      description,
      mpesaNumber,
      location,
      pickupTimeMin,
      pickupTimeMax,
      orderStartTime,
      orderEndTime,
      imageUrl,
      locationProofImageUrl
    } = req.body;

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

    const currentProfile = await query(
      `SELECT image_url, location_proof_image_url
       FROM vendors
       WHERE id = $1
       LIMIT 1`,
      [vendorId]
    );

    const existingImage = String(currentProfile.rows[0]?.image_url ?? "").trim();
    const existingProof = String(currentProfile.rows[0]?.location_proof_image_url ?? "").trim();
    const nextProofRaw = typeof locationProofImageUrl === "string" ? locationProofImageUrl : undefined;
    const nextProof = nextProofRaw === undefined ? existingProof || null : String(nextProofRaw).trim() || existingProof || null;

    const nextImageRaw = typeof imageUrl === "string" ? imageUrl : undefined;
    const nextImage = nextImageRaw === undefined ? existingImage || null : String(nextImageRaw).trim() || existingImage || null;

    const nextOrderStartTime = normalizeScheduleTime(orderStartTime, "08:00");
    const nextOrderEndTime = normalizeScheduleTime(orderEndTime, "22:00");

    if (!nextOrderStartTime || !nextOrderEndTime) {
      return res.status(400).json({ error: "Order start and end times must use HH:MM format" });
    }

    await query(
      `UPDATE vendors
       SET stall_name = $2,
           description = $3,
           mpesa_number = $4,
           location = $5,
           pickup_time_min = $6,
           pickup_time_max = $7,
           order_start_time = $8,
           order_end_time = $9,
           image_url = $10,
           location_proof_image_url = $11
       WHERE id = $1`,
      [
        vendorId,
        String(stallName).trim(),
        description ? String(description).trim() : null,
        String(mpesaNumber).trim(),
        location ? String(location).trim() : null,
        Number(pickupTimeMin) || 10,
        Number(pickupTimeMax) || 15,
        nextOrderStartTime,
        nextOrderEndTime,
        nextImage,
        nextProof
      ]
    );

    const refreshed = await query(
      `SELECT v.id, v.user_id, v.stall_name, v.description, v.mpesa_number, v.image_url, v.location,
              v.location_proof_image_url, v.pickup_time_min, v.pickup_time_max, v.order_start_time, v.order_end_time, v.is_active,
              COALESCE(v.verification_status, CASE WHEN v.is_active THEN 'approved' ELSE 'pending' END) AS verification_status,
              v.verification_notes, v.verified_at, v.verified_by,
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

export async function getVendorOrdersReport(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const period = String(req.query.period ?? "all").trim().toLowerCase();
    const values = [vendorId];
    const conditions = ["o.vendor_id = $1"];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (period === "today") {
      conditions.push("o.created_at::date = CURRENT_DATE");
    } else if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      values.push(startOfWeek.toISOString());
      conditions.push(`o.created_at >= $${values.length}::date AND o.created_at::date <= CURRENT_DATE`);
    } else if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      values.push(startOfMonth.toISOString());
      conditions.push(`o.created_at >= $${values.length}::date AND o.created_at::date <= CURRENT_DATE`);
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      values.push(startOfYear.toISOString());
      conditions.push(`o.created_at >= $${values.length}::date AND o.created_at::date <= CURRENT_DATE`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await query(
      `SELECT 
         o.id,
         o.public_id,
         o.student_name,
         o.vendor_id,
         o.total_amount,
         o.status,
         o.created_at,
         o.updated_at,
         v.stall_name AS vendor_name,
         v.location AS vendor_location,
         COUNT(oi.id)::int AS item_count,
         COALESCE(t.amount, 0)::numeric AS transaction_amount,
         COALESCE(t.commission, 0)::numeric AS commission,
         COALESCE(t.vendor_payout, 0)::numeric AS vendor_payout,
         COALESCE(t.status, 'pending') AS transaction_status
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN transactions t ON t.order_id = o.id
       ${whereClause}
       GROUP BY o.id, o.public_id, o.student_name, o.total_amount, o.status, o.created_at, o.updated_at, v.stall_name, v.location, t.id, t.amount, t.commission, t.vendor_payout, t.status
       ORDER BY o.created_at DESC`,
      values
    );

    const summaryResult = await query(
      `SELECT 
         COUNT(DISTINCT o.id)::int AS total_orders,
         COUNT(DISTINCT o.vendor_id)::int AS vendor_count,
         COALESCE(SUM(o.total_amount), 0)::numeric AS total_amount,
         COALESCE(SUM(t.amount), 0)::numeric AS total_revenue,
         COALESCE(SUM(t.commission), 0)::numeric AS total_commission,
         COALESCE(SUM(t.vendor_payout), 0)::numeric AS total_payout
       FROM orders o
       LEFT JOIN transactions t ON t.order_id = o.id
       ${whereClause}`,
      values
    );

    res.json({
      orders: result.rows,
      summary: summaryResult.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch vendor report" });
  }
}

export async function getVendorMenu(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      `SELECT m.*, COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) AS verification_status
       FROM menu_items m
       WHERE m.vendor_id = $1
       ORDER BY m.created_at DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
}

export async function getAdminMenuReview(req, res) {
  try {
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "all").trim().toLowerCase();
    const vendorId = Number(req.query.vendorId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 12));
    const offset = (page - 1) * pageSize;

    const values = [];
    const conditions = ["1=1"];

    if (["pending", "approved", "rejected"].includes(status)) {
      values.push(status);
      conditions.push(`COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) = $${values.length}`);
    }

    if (Number.isFinite(vendorId) && vendorId > 0) {
      values.push(vendorId);
      conditions.push(`m.vendor_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(m.name ILIKE $${values.length} OR m.category ILIKE $${values.length} OR v.stall_name ILIKE $${values.length})`);
    }

    const totalResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE ${conditions.join(" AND ")}`,
      values
    );
    const total = totalResult.rows[0]?.total ?? 0;

    const result = await query(
      `SELECT m.id, m.vendor_id, m.name, m.description, m.price, m.category, m.image_url,
              m.is_available, m.order_count,
              COALESCE(m.verification_status, CASE WHEN m.is_available THEN 'approved' ELSE 'pending' END) AS verification_status,
              m.verification_notes, m.verified_at, m.verified_by,
              v.stall_name AS vendor_name, v.image_url AS vendor_image_url
       FROM menu_items m
       INNER JOIN vendors v ON v.id = m.vendor_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY m.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );

    res.json({
      items: result.rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu review items" });
  }
}

export async function updateMenuVerificationStatus(req, res) {
  try {
    const itemId = Number(req.params.itemId);
    const status = String(req.body.status ?? "").toLowerCase();
    const notes = String(req.body.notes ?? "").trim();

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid menu verification status" });
    }

    const current = await query(`SELECT id FROM menu_items WHERE id = $1 LIMIT 1`, [itemId]);
    if (!current.rows.length) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const shouldBeAvailable = status === "approved";
    const result = await query(
      `UPDATE menu_items
       SET verification_status = $2,
           verification_notes = $3,
           is_available = $4,
           verified_at = $5,
           verified_by = $6
       WHERE id = $1
       RETURNING *`,
      [itemId, status, notes || null, shouldBeAvailable, status === "pending" ? null : new Date(), status === "pending" ? null : req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update menu verification" });
  }
}

export async function createVendorMenuItem(req, res) {
  try {
    const vendorId = Number(req.params.id);
    if (req.user.role === "vendor" && req.user.vendorId !== vendorId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (req.user.role === "vendor") {
      const approval = await ensureVendorApproved(vendorId);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
    }

    if (req.user.role === "vendor") {
      const configured = await ensureVendorDeliveryLocationConfigured(vendorId);
      if (!configured) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
    }

    const { name, description, price, category, imageUrl } = req.body;
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ error: "Category is required" });
    }
    const result = await query(
      `INSERT INTO menu_items (vendor_id, name, description, price, category, image_url, verification_status, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', false)
       RETURNING *`,
      [vendorId, name, description || null, Number(price), normalizedCategory, imageUrl || null]
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
      const approval = await ensureVendorApproved(current.rows[0].vendor_id);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
    }

    if (req.user.role === "vendor") {
      const configured = await ensureVendorDeliveryLocationConfigured(current.rows[0].vendor_id);
      if (!configured) {
        return res.status(400).json({ error: "Set at least one delivery location first under Delivery Locations." });
      }
    }

    const next = { ...current.rows[0], ...req.body };
    const normalizedCategory = normalizeCategory(next.category);
    if (!normalizedCategory) {
      return res.status(400).json({ error: "Category is required" });
    }
    const isVendorUpdate = req.user.role === "vendor";
    const result = await query(
      `UPDATE menu_items
       SET name = $2,
           description = $3,
           price = $4,
           category = $5,
           image_url = $6,
           is_available = $7,
           verification_status = $8,
           verification_notes = $9,
           verified_at = $10,
           verified_by = $11
       WHERE id = $1
       RETURNING *`,
      [
        Number(req.params.itemId),
        next.name,
        next.description,
        next.price,
        normalizedCategory,
        next.imageUrl ?? next.image_url,
        isVendorUpdate ? false : next.isAvailable ?? next.is_available,
        isVendorUpdate ? "pending" : next.verification_status ?? current.rows[0].verification_status,
        isVendorUpdate ? "Awaiting admin menu approval." : next.verification_notes ?? current.rows[0].verification_notes,
        isVendorUpdate ? null : next.verified_at ?? current.rows[0].verified_at,
        isVendorUpdate ? null : next.verified_by ?? current.rows[0].verified_by
      ]
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
      const approval = await ensureVendorApproved(current.rows[0].vendor_id);
      if (!approval.ok) {
        return res.status(approval.status).json({ error: approval.error });
      }
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
    const vendorId = Number(req.params.id);
    const current = await query(`SELECT id, is_active, COALESCE(verification_status, 'pending') AS verification_status FROM vendors WHERE id = $1 LIMIT 1`, [vendorId]);

    if (!current.rows.length) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!current.rows[0].is_active && current.rows[0].verification_status !== "approved") {
      return res.status(400).json({ error: "Approve vendor verification before activation." });
    }

    const result = await query(
      `UPDATE vendors
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING *`,
      [vendorId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle vendor" });
  }
}

export async function updateVendorVerificationStatus(req, res) {
  try {
    const vendorId = Number(req.params.id);
    const status = String(req.body.status ?? "").toLowerCase();
    const notes = String(req.body.notes ?? "").trim();

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    const current = await query(`SELECT id FROM vendors WHERE id = $1 LIMIT 1`, [vendorId]);
    if (!current.rows.length) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const shouldActivate = status === "approved";
    const result = await query(
      `UPDATE vendors
       SET verification_status = $2,
           verification_notes = $3,
           is_active = $4,
           verified_at = $5,
           verified_by = $6
       WHERE id = $1
       RETURNING *`,
      [vendorId, status, notes || null, shouldActivate, status === "pending" ? null : new Date(), status === "pending" ? null : req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update vendor verification" });
  }
}
