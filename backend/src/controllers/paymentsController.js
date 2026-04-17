import { pool } from "../db/client.js";
import { buildOrderPublicId, buildPickupCode, hydrateOrders } from "./helpers.js";
import { createCheckoutSession, getIntaSendConfig } from "../services/intasend.js";
import { calculateSplit } from "../services/payout.js";

function firstUrl(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)[0] || "";
}

function resolveApiBaseUrl(req) {
  const configured = firstUrl(process.env.API_BASE_URL);
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

function resolveClientBaseUrl(req) {
  const origin = req?.get?.("origin");
  if (origin) return origin;

  const configured = firstUrl(process.env.CLIENT_URL);
  return configured || "http://localhost:3000";
}

export async function getPaymentMode(_req, res) {
  const config = getIntaSendConfig();
  res.json({
    mode: config.mode,
    configured: config.configured,
    provider: "intasend"
  });
}

export async function handlePaymentCallback(req, res) {
  try {
    const paymentReference = String(req.query.paymentReference || req.query.api_ref || req.query.reference || "").trim();
    const outcome = String(req.query.status || req.query.state || "").toLowerCase();
    const publicOrderId = String(req.query.order || req.query.orderPublicId || "").trim();

    let transaction = null;

    if (paymentReference) {
      const result = await pool.query(`SELECT * FROM transactions WHERE payment_reference = $1 LIMIT 1`, [paymentReference]);
      transaction = result.rows[0] ?? null;
    }

    if (!transaction && publicOrderId) {
      const result = await pool.query(
        `SELECT t.*
         FROM transactions t
         INNER JOIN orders o ON o.id = t.order_id
         WHERE o.public_id = $1
         LIMIT 1`,
        [publicOrderId]
      );
      transaction = result.rows[0] ?? null;
    }

    if (!transaction) {
      const fallbackUrl = `${resolveClientBaseUrl(req)}/orders`;
      return res.redirect(fallbackUrl);
    }

    const transactionStatus = outcome === "failed" || outcome === "cancelled" || outcome === "canceled" ? "failed" : outcome ? "completed" : transaction.status;
    const orderStatus = transactionStatus === "completed" ? "paid" : "pending";

    await pool.query(
      `UPDATE transactions
       SET status = $2,
           updated_at = NOW(),
           raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{callback_status}', to_jsonb($3::text), true)
       WHERE id = $1`,
      [transaction.id, transactionStatus, outcome || "unknown"]
    );

    await pool.query(`UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1`, [transaction.order_id, orderStatus]);

    const orderLookup = await pool.query(`SELECT public_id FROM orders WHERE id = $1 LIMIT 1`, [transaction.order_id]);
    const nextPublicOrderId = orderLookup.rows[0]?.public_id;
    const targetUrl = nextPublicOrderId
      ? `${resolveClientBaseUrl(req)}/orders/${nextPublicOrderId}?payment=${encodeURIComponent(outcome || transactionStatus)}`
      : `${resolveClientBaseUrl(req)}/orders?payment=${encodeURIComponent(outcome || transactionStatus)}`;

    return res.redirect(targetUrl);
  } catch (_error) {
    return res.redirect(`${resolveClientBaseUrl(req)}/orders?payment=callback_error`);
  }
}

export async function checkout(req, res) {
  const client = await pool.connect();

  try {
    const { vendorId, studentName, notes, items, orderType = "dine_in", deliveryDetails = null } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "At least one item is required" });
    }

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor is required" });
    }

    const normalizedOrderType = orderType === "delivery" ? "delivery" : "dine_in";
    const vendorResult = await client.query(`SELECT id, location, is_active FROM vendors WHERE id = $1 LIMIT 1`, [vendorId]);
    if (!vendorResult.rows.length) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (!vendorResult.rows[0].is_active) {
      return res.status(400).json({ error: "Vendor is currently inactive" });
    }

    let hostelRow = null;
    let serviceAreaRow = null;
    let deliveryLocationRow = null;
    let pickupLocation = vendorResult.rows[0].location ?? null;
    let deliveryDetailsPayload = null;

    if (normalizedOrderType === "delivery") {
      if (!deliveryDetails || !deliveryDetails.mode) {
        return res.status(400).json({ error: "Delivery details are required for delivery orders" });
      }

      if (deliveryDetails.mode === "hostel") {
        const hostelId = Number(deliveryDetails.hostelId);
        const roomNumber = String(deliveryDetails.roomNumber ?? "").trim();

        if (!hostelId || !roomNumber) {
          return res.status(400).json({ error: "Hostel and room number are required" });
        }

        const hostelResult = await client.query(`SELECT id, name FROM hostels WHERE id = $1 AND is_active = true LIMIT 1`, [hostelId]);
        if (!hostelResult.rows.length) {
          return res.status(404).json({ error: "Hostel not found" });
        }

        hostelRow = hostelResult.rows[0];
        deliveryDetailsPayload = {
          mode: "hostel",
          hostelId: hostelRow.id,
          hostelName: hostelRow.name,
          roomNumber
        };
      } else if (deliveryDetails.mode === "off_campus") {
        const serviceAreaId = Number(deliveryDetails.serviceAreaId);
        const deliveryLocationId = Number(deliveryDetails.deliveryLocationId);

        if (!serviceAreaId || !deliveryLocationId) {
          return res.status(400).json({ error: "Service area and delivery location are required" });
        }

        const serviceAreaResult = await client.query(
          `SELECT sa.id, sa.name
           FROM service_areas sa
           INNER JOIN vendor_service_areas vsa ON vsa.service_area_id = sa.id
           WHERE vsa.vendor_id = $1 AND sa.id = $2 AND sa.is_active = true
           LIMIT 1`,
          [vendorId, serviceAreaId]
        );

        if (!serviceAreaResult.rows.length) {
          return res.status(400).json({ error: "Selected service area is not available for this vendor" });
        }

        const deliveryLocationResult = await client.query(
          `SELECT vdl.id, vdl.label, vdl.location, sa.name AS service_area_name
           FROM vendor_delivery_locations vdl
           LEFT JOIN service_areas sa ON sa.id = vdl.service_area_id
           WHERE vdl.vendor_id = $1 AND vdl.service_area_id = $2 AND vdl.id = $3
           LIMIT 1`,
          [vendorId, serviceAreaId, deliveryLocationId]
        );

        if (!deliveryLocationResult.rows.length) {
          return res.status(400).json({ error: "Selected delivery location is not available" });
        }

        serviceAreaRow = serviceAreaResult.rows[0];
        deliveryLocationRow = deliveryLocationResult.rows[0];
        pickupLocation = deliveryLocationRow.location;
        deliveryDetailsPayload = {
          mode: "off_campus",
          serviceAreaId: serviceAreaRow.id,
          serviceAreaName: serviceAreaRow.name,
          deliveryLocationId: deliveryLocationRow.id,
          deliveryLocationLabel: deliveryLocationRow.label,
          deliveryLocation: deliveryLocationRow.location
        };
      } else if (deliveryDetails.mode === "other") {
        const otherLocationName = String(deliveryDetails.otherLocationName ?? "").trim();
        const otherLocationDetails = String(deliveryDetails.otherLocationDetails ?? "").trim();

        if (!otherLocationName || !otherLocationDetails) {
          return res.status(400).json({ error: "Please share the place name and delivery details" });
        }

        deliveryDetailsPayload = {
          mode: "other",
          otherLocationName,
          otherLocationDetails
        };
      } else {
        return res.status(400).json({ error: "Invalid delivery mode" });
      }
    }

    await client.query("BEGIN");

    const menuIds = items.map((item) => item.menuItemId);
    const menuResult = await client.query(
      `SELECT id, name, price, vendor_id FROM menu_items WHERE id = ANY($1::int[]) AND vendor_id = $2`,
      [menuIds, vendorId]
    );

    if (menuResult.rows.length !== menuIds.length) {
      throw new Error("One or more menu items are unavailable for this vendor");
    }

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const menuItem = menuResult.rows.find((entry) => entry.id === item.menuItemId);
      if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
      totalAmount += Number(menuItem.price) * item.quantity;
      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(menuItem.price)
      };
    });

     const orderResult = await client.query(
      `INSERT INTO orders (student_id, vendor_id, public_id, student_name, order_type, status, total_amount, pickup_code, pickup_location, delivery_details, hostel_id, room_number, service_area_id, notes)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9::jsonb, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.user.id,
        vendorId,
        buildOrderPublicId(),
        studentName || req.user.name || "Student",
        normalizedOrderType,
        totalAmount,
        buildPickupCode(),
        pickupLocation,
        deliveryDetailsPayload ? JSON.stringify(deliveryDetailsPayload) : null,
        hostelRow?.id ?? null,
        deliveryDetailsPayload?.roomNumber ?? null,
        serviceAreaRow?.id ?? null,
        notes || null
      ]
    );

    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.menuItemId, item.menuItemName, item.quantity, item.unitPrice]
      );

      await client.query(
        `UPDATE menu_items
         SET order_count = order_count + $2
         WHERE id = $1`,
        [item.menuItemId, item.quantity]
      );
    }

    const intasendConfig = getIntaSendConfig();
    const paymentReference = `ORD-${order.id}-${Date.now()}`;
    const split = calculateSplit(totalAmount);
    const studentResult = await client.query(`SELECT email, name FROM users WHERE id = $1 LIMIT 1`, [req.user.id]);
    const studentEmail = studentResult.rows[0]?.email || "student@campuseats.local";
    const studentDisplayName = studentResult.rows[0]?.name || studentName || "Student";

    await client.query(`UPDATE orders SET payment_reference = $2 WHERE id = $1`, [order.id, paymentReference]);

    if (!intasendConfig.configured) {
      throw new Error(`IntaSend ${intasendConfig.mode.toUpperCase()} keys are not configured`);
    }

    const apiBaseUrl = resolveApiBaseUrl(req);
    const clientBaseUrl = resolveClientBaseUrl(req);
    const session = await createCheckoutSession({
      amount: totalAmount,
      email: studentEmail,
      customerName: studentDisplayName,
      reference: paymentReference,
      callbackUrl: `${apiBaseUrl}/api/webhook/intasend`,
      redirectUrl: `${clientBaseUrl}/orders/${order.public_id}`,
      metadata: {
        orderId: order.id,
        publicOrderId: order.public_id,
        mode: intasendConfig.mode
      }
    });

    if (!session.checkoutUrl) {
      throw new Error("IntaSend checkout URL was not returned");
    }

    const checkoutUrl = session.checkoutUrl;
    const providerPayload = session.rawPayload;
    const transactionStatus = "pending";

    await client.query(
      `INSERT INTO transactions (order_id, payment_provider, payment_reference, amount, commission, vendor_payout, payout_reference, status, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [order.id, "intasend", paymentReference, totalAmount, split.commission, split.vendorPayout, split.payoutReference, transactionStatus, JSON.stringify(providerPayload)]
    );

    await client.query("COMMIT");

    const fullOrder = await client.query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
       WHERE o.id = $1`,
      [order.id]
    );

    const [hydrated] = await hydrateOrders(fullOrder.rows);
    res.status(201).json({
      ...hydrated,
      checkout_url: checkoutUrl,
      payment_mode: intasendConfig.mode,
      last_callback_status: transactionStatus
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message || "Checkout failed" });
  } finally {
    client.release();
  }
}

export async function listTransactions(_req, res) {
  try {
    const result = await pool.query(
      `SELECT id, order_id, payment_reference, amount, commission, vendor_payout, status,
              COALESCE(raw_payload->>'status', raw_payload->>'state', raw_payload->>'event') AS last_callback_status,
              created_at
       FROM transactions
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
}

export async function simulatePaymentResult(req, res) {
  try {
    const config = getIntaSendConfig();
    if (config.mode !== "test") {
      return res.status(400).json({ error: "Payment simulation is only allowed in TEST mode" });
    }

    const orderId = Number(req.params.orderId);
    const outcome = String(req.body?.status || "success").toLowerCase();
    if (!orderId || !["success", "failed", "cancelled"].includes(outcome)) {
      return res.status(400).json({ error: "Provide a valid order ID and status: success|failed|cancelled" });
    }

    const transactionLookup = await pool.query(`SELECT * FROM transactions WHERE order_id = $1 LIMIT 1`, [orderId]);
    if (!transactionLookup.rows.length) {
      return res.status(404).json({ error: "Transaction not found for this order" });
    }

    const transactionStatus = outcome === "success" ? "completed" : "failed";
    const orderStatus = outcome === "success" ? "paid" : "pending";

    await pool.query(
      `UPDATE transactions
       SET status = $2,
           updated_at = NOW(),
           raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{status}', to_jsonb($3::text), true)
       WHERE id = $1`,
      [transactionLookup.rows[0].id, transactionStatus, outcome]
    );

    await pool.query(
      `UPDATE orders
       SET status = $2, updated_at = NOW()
       WHERE id = $1`,
      [orderId, orderStatus]
    );

    const refreshed = await pool.query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max,
              h.name AS hostel_name, sa.name AS service_area_name
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       LEFT JOIN hostels h ON h.id = o.hostel_id
       LEFT JOIN service_areas sa ON sa.id = o.service_area_id
       WHERE o.id = $1`,
      [orderId]
    );

    const [hydrated] = await hydrateOrders(refreshed.rows);
    return res.json({
      ...hydrated,
      payment_mode: config.mode,
      last_callback_status: transactionStatus
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to simulate payment result" });
  }
}
