import { pool } from "../db/client.js";
import { buildPickupCode, hydrateOrders } from "./helpers.js";
import { simulateCollection } from "../services/intasend.js";
import { calculateSplit } from "../services/payout.js";

export async function checkout(req, res) {
  const client = await pool.connect();

  try {
    const { vendorId, studentName, notes, items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "At least one item is required" });
    }

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor is required" });
    }

    await client.query("BEGIN");

    const menuIds = items.map((item) => item.menuItemId);
    const menuResult = await client.query(
      `SELECT id, name, price FROM menu_items WHERE id = ANY($1::int[])`,
      [menuIds]
    );

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
      `INSERT INTO orders (student_id, vendor_id, student_name, status, total_amount, pickup_code, notes)
       VALUES ($1, $2, $3, 'paid', $4, $5, $6)
       RETURNING *`,
      [req.user.id, vendorId, studentName || req.user.name || "Student", totalAmount, buildPickupCode(), notes || null]
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

    const collection = simulateCollection({ orderId: order.id, amount: totalAmount, customerName: studentName });
    const split = calculateSplit(totalAmount);

    await client.query(
      `UPDATE orders SET payment_reference = $2 WHERE id = $1`,
      [order.id, collection.paymentReference]
    );

    await client.query(
      `INSERT INTO transactions (order_id, payment_provider, payment_reference, amount, commission, vendor_payout, payout_reference, status, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8::jsonb)`,
      [order.id, collection.paymentProvider, collection.paymentReference, totalAmount, split.commission, split.vendorPayout, split.payoutReference, JSON.stringify(collection)]
    );

    await client.query("COMMIT");

    const fullOrder = await client.query(
      `SELECT o.*, v.stall_name AS vendor_name, v.location AS vendor_location,
              v.pickup_time_min, v.pickup_time_max
       FROM orders o
       INNER JOIN vendors v ON v.id = o.vendor_id
       WHERE o.id = $1`,
      [order.id]
    );

    const [hydrated] = await hydrateOrders(fullOrder.rows);
    res.status(201).json(hydrated);
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
      `SELECT id, amount, commission, vendor_payout, status, created_at
       FROM transactions
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
}
