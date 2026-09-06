-- ============================================================
-- SEED DATA — Handcrafted Articles PIM
-- Run this in the Supabase SQL Editor to populate test data.
-- UUID key:
--   0001 = collections
--   0002 = products
--   0003 = customers
--   0004 = customer_contacts
--   0005 = customer_addresses
--   0006 = customer_product_mappings
--   0007 = artisans
--   0008 = quotes
--   0009 = quote_items
--   000a = orders
--   000b = order_items
--   000c = artisan_assignments
-- ============================================================

-- ─── Collections ─────────────────────────────────────────────

INSERT INTO collections (id, name, description, status) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Textile Heritage',  'Block-printed and embroidered textiles', 'active'),
  ('00000000-0000-0000-0001-000000000002', 'Ceramic Artistry',  'Handthrown and hand-painted ceramics',   'active'),
  ('00000000-0000-0000-0001-000000000003', 'Woven Wonders',     'Handwoven baskets and home accessories', 'active');

-- ─── Products ────────────────────────────────────────────────

INSERT INTO products (id, internal_sku, name, description, collection_id, status) VALUES
  ('00000000-0000-0000-0002-000000000001', 'TH-001', 'Hand Block Printed Kurta',    'Natural dye block-printed cotton kurta', '00000000-0000-0000-0001-000000000001', 'active'),
  ('00000000-0000-0000-0002-000000000002', 'TH-002', 'Embroidered Table Runner',    'Silk thread embroidery on linen',        '00000000-0000-0000-0001-000000000001', 'active'),
  ('00000000-0000-0000-0002-000000000003', 'TH-003', 'Block Printed Tote Bag',      'Jaipur block-printed cotton tote',       '00000000-0000-0000-0001-000000000001', 'active'),
  ('00000000-0000-0000-0002-000000000004', 'CA-001', 'Ceramic Serving Bowl',        'Wheel-thrown terracotta serving bowl',   '00000000-0000-0000-0001-000000000002', 'active'),
  ('00000000-0000-0000-0002-000000000005', 'CA-002', 'Hand-Painted Mug Set (4pcs)', 'Set of 4 hand-painted ceramic mugs',     '00000000-0000-0000-0001-000000000002', 'active'),
  ('00000000-0000-0000-0002-000000000006', 'WW-001', 'Handwoven Storage Basket',    'Natural seagrass storage basket',        '00000000-0000-0000-0001-000000000003', 'active'),
  ('00000000-0000-0000-0002-000000000007', 'WW-002', 'Woven Wall Hanging',          'Macrame and wool wall hanging',          '00000000-0000-0000-0001-000000000003', 'active');

-- ─── Customers ───────────────────────────────────────────────

INSERT INTO customers (id, name, currency, payment_terms, notes, status) VALUES
  ('00000000-0000-0000-0003-000000000001', 'Artisan Bazaar Ltd',  'GBP', 'Net 30', 'UK wholesale buyer. Prefers consolidated shipments.', 'active'),
  ('00000000-0000-0000-0003-000000000002', 'World Craft Market',  'USD', 'Net 45', 'US importer. High volume orders, seasonal.',          'active'),
  ('00000000-0000-0000-0003-000000000003', 'Handmade Hub FZCO',   'AED', 'Net 30', 'Dubai-based retailer. Premium segment.',              'active');

-- ─── Customer Contacts ───────────────────────────────────────

INSERT INTO customer_contacts (id, customer_id, name, email, phone, title, is_primary) VALUES
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001', 'Sophie Williams',    'sophie@artisanbazaar.co.uk', '+44 20 7946 0123', 'Buying Manager',   true),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000001', 'James Harper',       'james@artisanbazaar.co.uk',  '+44 20 7946 0124', 'Logistics',        false),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000002', 'Emily Carter',       'emily@worldcraft.com',       '+1 212 555 0198',  'Head of Sourcing', true),
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000003', 'Khalid Al Mansoori', 'khalid@handmadehub.ae',      '+971 4 555 0210',  'General Manager',  true);

-- ─── Customer Addresses ──────────────────────────────────────

INSERT INTO customer_addresses (id, customer_id, type, address_line1, city, country) VALUES
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0003-000000000001', 'billing',  '14 Craft Lane',          'London',   'United Kingdom'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0003-000000000001', 'shipping', '14 Craft Lane',          'London',   'United Kingdom'),
  ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0003-000000000002', 'billing',  '200 Fifth Avenue, #300', 'New York', 'United States'),
  ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0003-000000000003', 'billing',  'IFZA Business Park',     'Dubai',    'United Arab Emirates');

-- ─── Customer Product Mappings ────────────────────────────────

INSERT INTO customer_product_mappings (id, customer_id, product_id, customer_sku, customer_description, price, currency, moq, lead_time, packaging_notes) VALUES
  -- Artisan Bazaar (GBP)
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'AB-KURTA-BLK', 'Block Print Kurta - Indigo',     28.00,  'GBP', 50,  '45 days', 'Individual poly bags, master carton of 24'),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000002', 'AB-TBLRUN-01', 'Embroidered Table Runner',       18.50,  'GBP', 30,  '30 days', 'Rolled and tissue wrapped'),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000004', 'AB-BOWL-TRR',  'Terracotta Serving Bowl',        22.00,  'GBP', 24,  '60 days', 'Individual bubble wrap, foam-lined carton'),
  -- World Craft Market (USD)
  ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000003', 'WCM-TOTE-BP',  'Jaipur Block Print Tote',        14.00,  'USD', 100, '30 days', 'Folded, stickered, polybag'),
  ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000005', 'WCM-MUG-S4',   'Handpainted Mug Set 4pc',        36.00,  'USD', 48,  '45 days', 'Individual mug boxes in set box'),
  ('00000000-0000-0000-0006-000000000006', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000006', 'WCM-BSKT-LG',  'Seagrass Storage Basket L',      24.00,  'USD', 50,  '30 days', 'Nested pack, 5 per carton'),
  -- Handmade Hub (AED)
  ('00000000-0000-0000-0006-000000000007', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000001', 'HH-KURT-001',  'Hand Block Print Kurta Premium', 135.00, 'AED', 20,  '45 days', 'Gift box with tissue paper'),
  ('00000000-0000-0000-0006-000000000008', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000007', 'HH-WALL-001',  'Boho Wall Hanging',               95.00, 'AED', 10,  '30 days', 'Rolled in kraft paper tube');

-- ─── Artisans ─────────────────────────────────────────────────

INSERT INTO artisans (id, name, phone, email, location, specializations, notes, status) VALUES
  ('00000000-0000-0000-0007-000000000001', 'Ravi Kumar',    '+91 98110 34521', 'ravi.kumar@gmail.com',    'Sanganer, Jaipur',   'Block printing, Natural dyes',          'Works with natural indigo and madder dyes. Capacity ~200 pcs/month.',     'active'),
  ('00000000-0000-0000-0007-000000000002', 'Meena Devi',    '+91 94601 22310', NULL,                      'Lucknow, UP',        'Chikankari embroidery, Silk thread',    'Master of chikankari. Lead time 3-4 weeks per 30 pcs.',                   'active'),
  ('00000000-0000-0000-0007-000000000003', 'Abdul Karim',   '+91 99290 11452', 'akarim.pottery@gmail.com','Khurja, UP',         'Wheel-thrown pottery, Ceramic glazing', 'Specialises in terracotta and blue pottery. Kiln capacity 500 pcs/month.', 'active'),
  ('00000000-0000-0000-0007-000000000004', 'Sunita Sharma', '+91 97800 56734', NULL,                      'Bikaner, Rajasthan', 'Seagrass weaving, Macrame',             'Family workshop with 4 weavers. Handles bulk basket orders.',             'active');

-- ─── Quotes ──────────────────────────────────────────────────

INSERT INTO quotes (id, quote_number, customer_id, status, notes, valid_until) VALUES
  ('00000000-0000-0000-0008-000000000001', 'Q-2026-1001', '00000000-0000-0000-0003-000000000001', 'sent',  'Spring 2026 collection order. Prioritise indigo colourway.', '2026-08-31'),
  ('00000000-0000-0000-0008-000000000002', 'Q-2026-1002', '00000000-0000-0000-0003-000000000002', 'draft', 'Initial inquiry for summer range.',                          '2026-09-15');

INSERT INTO quote_items (id, quote_id, product_id, customer_sku, unit_price, currency, quantity, moq, lead_time, sort_order) VALUES
  -- Q-2026-1001 (Artisan Bazaar)
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0002-000000000001', 'AB-KURTA-BLK', 28.00, 'GBP', 100, 50, '45 days', 0),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0002-000000000002', 'AB-TBLRUN-01', 18.50, 'GBP',  60, 30, '30 days', 1),
  -- Q-2026-1002 (World Craft Market)
  ('00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0002-000000000003', 'WCM-TOTE-BP',  14.00, 'USD', 200, 100, '30 days', 0),
  ('00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0002-000000000005', 'WCM-MUG-S4',   36.00, 'USD',  96,  48, '45 days', 1);

-- ─── Orders ──────────────────────────────────────────────────

INSERT INTO orders (id, order_number, customer_id, quote_id, status, notes) VALUES
  ('00000000-0000-0000-000a-000000000001', 'O-2026-2001', '00000000-0000-0000-0003-000000000003', NULL,                                   'confirmed',     'Handmade Hub reorder — Eid collection.'),
  ('00000000-0000-0000-000a-000000000002', 'O-2026-2002', '00000000-0000-0000-0003-000000000002', NULL,                                   'in_production', 'Summer basket range for US market.'),
  ('00000000-0000-0000-000a-000000000003', 'O-2026-2003', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0008-000000000001', 'pending',       'Created from quote Q-2026-1001.');

INSERT INTO order_items (id, order_id, product_id, customer_sku, unit_price, currency, quantity, sort_order) VALUES
  -- O-2026-2001 (Handmade Hub — confirmed)
  ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0002-000000000001', 'HH-KURT-001', 135.00, 'AED',  40, 0),
  ('00000000-0000-0000-000b-000000000002', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0002-000000000007', 'HH-WALL-001',  95.00, 'AED',  15, 1),
  -- O-2026-2002 (World Craft Market — in_production)
  ('00000000-0000-0000-000b-000000000003', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0002-000000000006', 'WCM-BSKT-LG',  24.00, 'USD', 150, 0),
  ('00000000-0000-0000-000b-000000000004', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0002-000000000003', 'WCM-TOTE-BP',  14.00, 'USD', 200, 1),
  -- O-2026-2003 (Artisan Bazaar — pending, from quote)
  ('00000000-0000-0000-000b-000000000005', '00000000-0000-0000-000a-000000000003', '00000000-0000-0000-0002-000000000001', 'AB-KURTA-BLK', 28.00, 'GBP', 100, 0),
  ('00000000-0000-0000-000b-000000000006', '00000000-0000-0000-000a-000000000003', '00000000-0000-0000-0002-000000000002', 'AB-TBLRUN-01', 18.50, 'GBP',  60, 1);

-- ─── Artisan Assignments ──────────────────────────────────────
-- O-2026-2001: Handmade Hub (confirmed) — assigned/pending, not yet in_progress
--   Kurtas (40 total): 25 to Ravi (assigned), 15 to Meena (pending) — fully allocated
--   Wall Hangings (15 total): 15 to Sunita (assigned) — fully allocated
INSERT INTO artisan_assignments (id, order_id, order_item_id, artisan_id, quantity, rate, status, expected_delivery_date, notes) VALUES
  ('00000000-0000-0000-000c-000000000001', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0007-000000000001', 25, 380.00, 'assigned',    '2026-08-20', 'Indigo colourway only'),
  ('00000000-0000-0000-000c-000000000002', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0007-000000000002', 15, 420.00, 'pending',     '2026-08-25', 'Embroidered neckline variant'),
  ('00000000-0000-0000-000c-000000000003', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0007-000000000004', 15, 520.00, 'assigned',    '2026-08-22', NULL),

-- O-2026-2002: World Craft Market (in_production) — mix of completed and in_progress
--   Baskets (150 total): 100 completed + 50 in_progress (Sunita)
--   Totes (200 total): 120 completed + 80 in_progress (Ravi)
  ('00000000-0000-0000-000c-000000000004', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-000b-000000000003', '00000000-0000-0000-0007-000000000004', 100, 280.00, 'completed',   '2026-07-30', 'First batch'),
  ('00000000-0000-0000-000c-000000000005', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-000b-000000000003', '00000000-0000-0000-0007-000000000004',  50, 280.00, 'in_progress', '2026-08-10', 'Second batch'),
  ('00000000-0000-0000-000c-000000000006', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-000b-000000000004', '00000000-0000-0000-0007-000000000001', 120, 195.00, 'completed',   '2026-07-28', 'Natural dye batch 1'),
  ('00000000-0000-0000-000c-000000000007', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-000b-000000000004', '00000000-0000-0000-0007-000000000001',  80, 195.00, 'in_progress', '2026-08-08', 'Natural dye batch 2');

-- NOTE: O-2026-2003 (Artisan Bazaar, pending) has NO assignments intentionally
-- — use this order to test the unassigned warning state in the UI.
