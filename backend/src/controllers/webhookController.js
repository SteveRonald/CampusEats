import { query } from "../db/client.js";

function mapIncomingStatus(statusValue) {
  const normalized = String(statusValue || "").toLowerCase();
  if (["completed", "success", "successful", "paid"].includes(normalized)) {
    return { transaction: "completed", order: "paid" };
  }
  if (["failed", "cancelled", "canceled"].includes(normalized)) {
    return { transaction: "failed", order: "pending" };
  }
  return { transaction: "pending", order: "pending" };
}

export async function handleIntaSendWebhook(req, res) {
  try {
    const webhookToken = process.env.INTASEND_WEBHOOK_TOKEN;
    if (webhookToken) {
      const receivedToken = req.get("x-intasend-webhook-token");
      if (!receivedToken || receivedToken !== webhookToken) {
        return res.status(401).json({ error: "Invalid webhook token" });
      }
    }

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
    const mapped = mapIncomingStatus(status);

    if (transaction.status === mapped.transaction) {
      console.log("[IntaSend webhook] duplicate event ignored", {
        transactionId: transaction.id,
        paymentReference: transaction.payment_reference,
        status: mapped.transaction
      });
      return res.json({ received: true, duplicate: true });
    }

    const transactionResult = await query(
      `UPDATE transactions
       SET status = $2, updated_at = NOW(), raw_payload = $3::jsonb
       WHERE id = $1
       RETURNING *`,
      [transaction.id, mapped.transaction, JSON.stringify(req.body)]
    );

    if (transactionResult.rows[0]) {
      await query(
        `UPDATE orders
         SET status = $2, updated_at = NOW()
         WHERE id = $1`,
        [transactionResult.rows[0].order_id, mapped.order]
      );
    }

    console.log("[IntaSend webhook] processed", {
      transactionId: transaction.id,
      paymentReference: transaction.payment_reference,
      status: mapped.transaction
    });

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to process webhook" });
  }
}
