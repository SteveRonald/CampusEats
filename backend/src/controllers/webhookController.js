import { query } from "../db/client.js";

export async function handleIntaSendWebhook(req, res) {
  try {
    const { paymentReference, orderId, status } = req.body;

    if (!paymentReference && !orderId) {
      return res.status(400).json({ error: "paymentReference or orderId is required" });
    }

    const lookup = paymentReference
      ? await query(`SELECT * FROM transactions WHERE payment_reference = $1 LIMIT 1`, [paymentReference])
      : await query(`SELECT * FROM transactions WHERE order_id = $1 LIMIT 1`, [Number(orderId)]);

    if (!lookup.rows.length) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = lookup.rows[0];

    const transactionResult = await query(
      `UPDATE transactions
       SET status = $2, updated_at = NOW(), raw_payload = $3::jsonb
       WHERE id = $1
       RETURNING *`,
      [transaction.id, status === "failed" ? "failed" : "completed", JSON.stringify(req.body)]
    );

    if (transactionResult.rows[0]) {
      await query(
        `UPDATE orders
         SET status = $2, updated_at = NOW()
         WHERE id = $1`,
        [transactionResult.rows[0].order_id, status === "failed" ? "pending" : "paid"]
      );
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to process webhook" });
  }
}
