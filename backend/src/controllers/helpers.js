import { query } from "../db/client.js";

export function buildPickupCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function hydrateOrders(orderRows) {
  if (!orderRows.length) return [];

  const orderIds = orderRows.map((order) => order.id);
  const itemResult = await query(
    `SELECT id, order_id, menu_item_id, menu_item_name, quantity, unit_price
     FROM order_items
     WHERE order_id = ANY($1::int[])
     ORDER BY id ASC`,
    [orderIds]
  );

  return orderRows.map((order) => ({
    ...order,
    items: itemResult.rows.filter((item) => item.order_id === order.id)
  }));
}
