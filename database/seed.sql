INSERT INTO users (id, name, email, phone, password_hash, role)
VALUES
  (1, 'Campus Student', 'student@moi.ac.ke', '0711000001', 'demo123', 'student'),
  (2, 'Mama Njeri', 'mama@moi.ac.ke', '0711000002', 'demo123', 'vendor'),
  (3, 'Campus Admin', 'admin@campuseats.co.ke', '0711000003', 'admin123', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (id, user_id, stall_name, description, mpesa_number, image_url, location, pickup_time_min, pickup_time_max, is_active)
VALUES
  (1, 2, 'Mama Njeri Kitchen', 'Fast Kenyan lunches between classes.', '0711000002', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Moi University Main Campus', 10, 15, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_areas (id, name, is_active)
VALUES
  (1, 'Moi University Main Campus', TRUE),
  (2, 'Kesses Town', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hostels (id, name, is_active)
VALUES
  (1, 'Hostel A', TRUE),
  (2, 'Hostel B', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_service_areas (id, vendor_id, service_area_id)
VALUES
  (1, 1, 1),
  (2, 1, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_delivery_locations (id, vendor_id, service_area_id, label, location, is_default)
VALUES
  (1, 1, 1, 'Campus Gate Pickup', 'Moi University Main Campus Gate', TRUE),
  (2, 1, 2, 'Kesses Town Pickup', 'Kesses Town Stage', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, vendor_id, name, description, price, category, image_url, is_available, order_count)
VALUES
  (1, 1, 'Pilau Bowl', 'Spiced rice with kachumbari and beef.', 180.00, 'Rice', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', TRUE, 12),
  (2, 1, 'Chapati Beans', 'Soft chapati with rich beans stew.', 120.00, 'Quick Lunch', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80', TRUE, 19),
  (3, 1, 'Ugali Fish Fry', 'Fresh tilapia, ugali and greens.', 240.00, 'Kenyan Classics', 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80', TRUE, 8),
  (4, 1, 'Fruit Juice', 'Fresh passion juice for quick pickup.', 70.00, 'Drinks', 'https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=1200&q=80', TRUE, 15)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1), TRUE);
SELECT setval('vendors_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM vendors), 1), TRUE);
SELECT setval('service_areas_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM service_areas), 1), TRUE);
SELECT setval('hostels_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM hostels), 1), TRUE);
SELECT setval('vendor_service_areas_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM vendor_service_areas), 1), TRUE);
SELECT setval('vendor_delivery_locations_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM vendor_delivery_locations), 1), TRUE);
SELECT setval('menu_items_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM menu_items), 1), TRUE);
