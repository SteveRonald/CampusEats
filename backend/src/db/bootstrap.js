import { pool } from "./client.js";

export async function ensureDeliverySchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_areas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hostels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendor_service_areas (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      service_area_id INTEGER NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (vendor_id, service_area_id)
    );

    CREATE TABLE IF NOT EXISTS vendor_delivery_locations (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      service_area_id INTEGER REFERENCES service_areas(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      location TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendor_delivery_location_recommendations (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      source_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      service_area_id INTEGER REFERENCES service_areas(id) ON DELETE SET NULL,
      place_name TEXT NOT NULL,
      place_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored')),
      accepted_location_id INTEGER REFERENCES vendor_delivery_locations(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_id TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_details JSONB`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS hostel_id INTEGER`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_number TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_area_id INTEGER`);

  await pool.query(`
    UPDATE orders
    SET public_id = COALESCE(public_id, 'ord_' || substr(md5(id::text || '-' || created_at::text), 1, 16))
    WHERE public_id IS NULL OR public_id = ''
  `);

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_id ON orders(public_id)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_vendor_delivery_recommendations_vendor_status
     ON vendor_delivery_location_recommendations(vendor_id, status)`
  );
}