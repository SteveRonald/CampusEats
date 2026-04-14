import { query } from "../db/client.js";

export function buildPickupCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function hydrateOrders(orderRows) {
  if (!orderRows.length) return [];

  const orderIds = orderRows.map((order) => order.id);
  const itemResult = await query(
    `SELECT oi.id, oi.order_id, oi.menu_item_id, oi.menu_item_name, oi.quantity, oi.unit_price,
            m.image_url AS menu_item_image_url
     FROM order_items oi
     LEFT JOIN menu_items m ON m.id = oi.menu_item_id
     WHERE order_id = ANY($1::int[])
     ORDER BY oi.id ASC`,
    [orderIds]
  );

  return orderRows.map((order) => ({
    ...order,
    items: itemResult.rows.filter((item) => item.order_id === order.id)
  }));
}
