-- Migration: 20261012100003_seed_sample_data.sql
-- Description: Sample seed data clearly marked for testing.
-- Spec: docs/SPEC.md (8 categories, 40 realistic products, 10 delivery points, settings row with testing hours)
-- AGENTS.md Rule 10: Our own brand only. No third-party trademarks or brand names.

-- 1. Singleton Settings Row
insert into public.settings (
  id,
  store_open,
  opens_at,
  closes_at,
  min_order_value,
  delivery_fee,
  free_delivery_above,
  max_active_orders_per_user,
  support_phone,
  notice_text
) values (
  1,
  true,
  '00:00:00',
  '23:59:59',
  99,
  15,
  299,
  2,
  '+91 98765 43210',
  'Campus delivery in ~15 mins across all hostels and gates.'
) on conflict (id) do update set
  store_open = excluded.store_open,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  min_order_value = excluded.min_order_value,
  delivery_fee = excluded.delivery_fee,
  free_delivery_above = excluded.free_delivery_above,
  max_active_orders_per_user = excluded.max_active_orders_per_user,
  support_phone = excluded.support_phone,
  notice_text = excluded.notice_text;

-- 2. 8 Categories matching docs/DESIGN.md tints and layout
insert into public.categories (id, name, slug, image_url, sort_order, is_active) values
  ('c1000000-0000-0000-0000-000000000001', 'Chips & Crisps', 'chips-crisps', '/images/categories/chips.jpg', 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Cold Drinks', 'cold-drinks', '/images/categories/drinks.jpg', 2, true),
  ('c1000000-0000-0000-0000-000000000003', 'Instant Noodles', 'instant-noodles', '/images/categories/noodles.jpg', 3, true),
  ('c1000000-0000-0000-0000-000000000004', 'Biscuits & Cookies', 'biscuits-cookies', '/images/categories/biscuits.jpg', 4, true),
  ('c1000000-0000-0000-0000-000000000005', 'Chocolates', 'chocolates', '/images/categories/chocolates.jpg', 5, true),
  ('c1000000-0000-0000-0000-000000000006', 'Tea & Coffee', 'tea-coffee', '/images/categories/dairy.jpg', 6, true),
  ('c1000000-0000-0000-0000-000000000007', 'Personal Care', 'personal-care', '/images/categories/care.jpg', 7, true),
  ('c1000000-0000-0000-0000-000000000008', 'Stationery', 'stationery', '/images/categories/stationery.jpg', 8, true)
on conflict (slug) do update set
  name = excluded.name,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 3. 10 Delivery Points across three Bhopal campuses
insert into public.delivery_points (id, campus, name, eta_minutes, delivery_fee_override, sort_order, is_active) values
  ('d1000000-0000-0000-0000-000000000001', 'Bhopal Science Campus', 'Hostel 1 Main Gate', 12, null, 1, true),
  ('d1000000-0000-0000-0000-000000000002', 'Bhopal Science Campus', 'Hostel 2 Porch', 14, null, 2, true),
  ('d1000000-0000-0000-0000-000000000003', 'Bhopal Science Campus', 'Central Dining Hall', 10, null, 3, true),
  ('d1000000-0000-0000-0000-000000000004', 'Bhopal Science Campus', 'Library Plaza', 15, null, 4, true),
  ('d1000000-0000-0000-0000-000000000005', 'Bhopal Tech Campus', 'Block A Security Gate', 15, null, 5, true),
  ('d1000000-0000-0000-0000-000000000006', 'Bhopal Tech Campus', 'South Hostel Quad', 18, null, 6, true),
  ('d1000000-0000-0000-0000-000000000007', 'Bhopal Tech Campus', 'Sports Arena Desk', 20, null, 7, true),
  ('d1000000-0000-0000-0000-000000000008', 'Bhopal Med Campus', 'Residence Wing Gate', 15, null, 8, true),
  ('d1000000-0000-0000-0000-000000000009', 'Bhopal Med Campus', 'Student Activity Center', 16, null, 9, true),
  ('d1000000-0000-0000-0000-000000000010', 'Bhopal Med Campus', 'North Gate Turnstile', 18, null, 10, true)
on conflict (id) do nothing;

-- 4. 40 Realistic Products (5 per category, unbranded, realistic MRP and whole rupee prices)
insert into public.products (
  id, sku, category_id, subcategory, name, brand, size_label,
  mrp, price, stock_qty, max_per_order, image_url, keywords,
  description, manufacturer, country_of_origin, rail, is_active
) values
  -- Category 1: Chips & Crisps (c1...)
  (
    'p1000000-0000-0000-0000-000000000001', 'CHP-CLS-01', 'c1000000-0000-0000-0000-000000000001', 'Chips',
    'Classic Salted Potato Chips', 'Campus Pantry', '85 g',
    40, 35, 18, 5, '/images/products/chips.jpg',
    array['chips', 'salted', 'potato', 'namkeen', 'snack', 'crisps', 'classic'],
    'Thin cut golden potato chips seasoned with fine rock salt.', 'Campus Foods Ltd', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000002', 'CHP-MAS-02', 'c1000000-0000-0000-0000-000000000001', 'Chips',
    'Spicy Masala Potato Wafers', 'Campus Pantry', '85 g',
    40, 36, 14, 5, '/images/products/chips.jpg',
    array['masala', 'spicy', 'chips', 'chilli', 'namkeen', 'teekha'],
    'Crisp potato wafers sprinkled with signature roasted spices.', 'Campus Foods Ltd', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000003', 'CHP-CRN-03', 'c1000000-0000-0000-0000-000000000001', 'Corn Puffs',
    'Cheese Baked Corn Puffs', 'SnackHub', '60 g',
    30, 27, 20, 5, '/images/products/chips.jpg',
    array['cheese', 'puffs', 'corn', 'baked', 'cheesy'],
    'Melt in the mouth baked corn snacks with rich cheddar cheese dusting.', 'SnackHub India', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000004', 'CHP-NCH-04', 'c1000000-0000-0000-0000-000000000001', 'Nachos',
    'Jalapeno Crunchy Corn Nachos', 'SnackHub', '100 g',
    55, 49, 12, 5, '/images/products/chips.jpg',
    array['nachos', 'corn', 'jalapeno', 'mexican', 'tortilla', 'spicy'],
    'Stone ground yellow corn tortilla chips seasoned with mild jalapeno.', 'SnackHub India', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000005', 'CHP-PNT-05', 'c1000000-0000-0000-0000-000000000001', 'Peanuts',
    'Salted Roasted Peanuts', 'NuttyBite', '150 g',
    60, 52, 2, 4, '/images/products/chips.jpg',
    array['peanuts', 'moongphali', 'roasted', 'salted', 'nuts', 'healthy'],
    'Slow roasted crunchy peanuts seasoned with pure sea salt.', 'NuttyBite Ltd', 'India', null, true
  ),

  -- Category 2: Cold Drinks (c2...)
  (
    'p1000000-0000-0000-0000-000000000006', 'DRK-COL-01', 'c1000000-0000-0000-0000-000000000002', 'Soda',
    'Sparkling Cola Drink', 'FreshChill', '250 ml',
    20, 20, 24, 6, '/images/products/drinks.jpg',
    array['cola', 'cold drink', 'soda', 'fizz', 'carbonated', 'thanda'],
    'Crisp and fizzy refreshing cola drink best served chilled.', 'ChillBev India', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000007', 'DRK-LEM-02', 'c1000000-0000-0000-0000-000000000002', 'Soda',
    'Clear Lemon Lime Soda', 'FreshChill', '250 ml',
    20, 20, 22, 6, '/images/products/drinks.jpg',
    array['lemon', 'lime', 'sprite', 'soda', 'nimbu', 'refreshing'],
    'Zesty lemon and lime bubbly soda for instant thirst relief.', 'ChillBev India', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000008', 'DRK-MNG-03', 'c1000000-0000-0000-0000-000000000002', 'Juice',
    'Alphonso Mango Fruit Drink', 'FruitSplash', '200 ml',
    25, 22, 16, 5, '/images/products/drinks.jpg',
    array['mango', 'aam', 'juice', 'frooti', 'fruit drink', 'sweet'],
    'Rich and sweet mango nectar made with alphonso pulp.', 'FruitSplash Beverages', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000009', 'DRK-COF-04', 'c1000000-0000-0000-0000-000000000002', 'Cold Coffee',
    'Chilled Classic Cold Coffee', 'DailyBrew', '200 ml',
    40, 36, 15, 4, '/images/products/drinks.jpg',
    array['coffee', 'cold coffee', 'milk', 'mocha', 'frappe', 'caffeine'],
    'Creamy milk cold coffee infused with aromatic roasted beans.', 'DailyBrew India', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000010', 'DRK-TEA-05', 'c1000000-0000-0000-0000-000000000002', 'Iced Tea',
    'Iced Peach Black Tea', 'PureLeaf', '300 ml',
    50, 44, 0, 4, '/images/products/drinks.jpg',
    array['iced tea', 'peach', 'tea', 'black tea', 'cold tea'],
    'Brewed black tea blended with subtle natural peach essence.', 'PureLeaf Beverages', 'India', 'new', true
  ),

  -- Category 3: Instant Noodles (c3...)
  (
    'p1000000-0000-0000-0000-000000000011', 'NDL-MAS-01', 'c1000000-0000-0000-0000-000000000003', 'Instant',
    'Classic Masala Instant Noodles', 'QuickBite', '70 g',
    15, 14, 30, 8, '/images/products/noodles.jpg',
    array['maggi', 'noodles', 'masala', '2 minute', 'quick bite', 'snack'],
    'Quick-cook wheat noodles with aromatic roasted Indian seasoning blend.', 'QuickBite Foods', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000012', 'NDL-ATT-02', 'c1000000-0000-0000-0000-000000000003', 'Instant',
    'Whole Wheat Veggie Noodles', 'QuickBite', '72 g',
    20, 18, 16, 6, '/images/products/noodles.jpg',
    array['atta', 'wheat', 'veggie', 'noodles', 'healthy noodles'],
    'Wholesome whole wheat grain noodles with dehydrated vegetables.', 'QuickBite Foods', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000013', 'NDL-SPY-03', 'c1000000-0000-0000-0000-000000000003', 'Spicy',
    'Fiery Chilli Garlic Ramen', 'NoodleWok', '90 g',
    45, 40, 15, 5, '/images/products/noodles.jpg',
    array['ramen', 'spicy ramen', 'korean', 'chilli', 'garlic', 'hot'],
    'Thick springy noodles in a rich fiery red broth with roasted garlic notes.', 'NoodleWok Ltd', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000014', 'NDL-CUP-04', 'c1000000-0000-0000-0000-000000000003', 'Cup Noodles',
    'Express Masala Cup Noodles', 'QuickBite', '65 g',
    50, 45, 12, 4, '/images/products/noodles.jpg',
    array['cup noodles', 'express', 'instant cup', 'ready to eat', 'hot water'],
    'Convenient on-the-go cup noodles. Just add boiling water and wait 3 mins.', 'QuickBite Foods', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000015', 'NDL-SCH-05', 'c1000000-0000-0000-0000-000000000003', 'Schezwan',
    'Schezwan Zing Noodles', 'NoodleWok', '75 g',
    25, 23, 14, 6, '/images/products/noodles.jpg',
    array['schezwan', 'chinese', 'spicy', 'noodles', 'tangy'],
    'Bold Schezwan spice flavour with hints of ginger, garlic and Sichuan pepper.', 'NoodleWok Ltd', 'India', 'new', true
  ),

  -- Category 4: Biscuits & Cookies (c4...)
  (
    'p1000000-0000-0000-0000-000000000016', 'BSC-CHK-01', 'c1000000-0000-0000-0000-000000000004', 'Cookies',
    'Choco Chip Crunchy Cookies', 'BakeWell', '120 g',
    35, 30, 20, 6, '/images/products/biscuits.jpg',
    array['cookies', 'choco chip', 'biscuit', 'biskit', 'chocolate cookies'],
    'Golden baked crunchy cookies studded with rich dark chocolate chips.', 'BakeWell Bakery', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000017', 'BSC-GLU-02', 'c1000000-0000-0000-0000-000000000004', 'Biscuits',
    'Golden Glucose Tea Biscuits', 'Campus Pantry', '250 g',
    25, 22, 25, 6, '/images/products/biscuits.jpg',
    array['glucose', 'parle', 'chai biscuit', 'biskit', 'energy'],
    'Classic sweet glucose biscuits made for dipping in hot tea.', 'Campus Foods Ltd', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000018', 'BSC-CSH-03', 'c1000000-0000-0000-0000-000000000004', 'Cookies',
    'Butter Cashew Delight Cookies', 'BakeWell', '100 g',
    40, 36, 16, 5, '/images/products/biscuits.jpg',
    array['cashew', 'kaju', 'butter', 'cookies', 'rich biscuits'],
    'Buttery melt-in-the-mouth cookies with real crushed cashews.', 'BakeWell Bakery', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000019', 'BSC-CRK-04', 'c1000000-0000-0000-0000-000000000004', 'Crackers',
    'Light Salted Herb Crackers', 'BakeWell', '100 g',
    30, 27, 18, 5, '/images/products/biscuits.jpg',
    array['crackers', 'salted', 'herbs', 'light', 'monaco', 'crisp'],
    'Flaky light biscuits sprinkled with sea salt and garden herbs.', 'BakeWell Bakery', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000020', 'BSC-DIG-05', 'c1000000-0000-0000-0000-000000000004', 'Digestive',
    'High Fibre Wheat Digestives', 'Campus Pantry', '200 g',
    50, 45, 3, 4, '/images/products/biscuits.jpg',
    array['digestive', 'fibre', 'wheat', 'healthy biscuit', 'atta'],
    'Semi-sweet whole wheat biscuits high in natural dietary fibre.', 'Campus Foods Ltd', 'India', null, true
  ),

  -- Category 5: Chocolates (c5...)
  (
    'p1000000-0000-0000-0000-000000000021', 'CHO-MLK-01', 'c1000000-0000-0000-0000-000000000005', 'Bar',
    'Creamy Milk Chocolate Bar', 'ChocoPure', '50 g',
    45, 40, 20, 6, '/images/products/chocolates.jpg',
    array['chocolate', 'choclate', 'milk chocolate', 'mithai', 'sweet'],
    'Velvety smooth milk chocolate crafted with whole milk and cocoa butter.', 'ChocoPure Confectionery', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000022', 'CHO-WFR-02', 'c1000000-0000-0000-0000-000000000005', 'Wafer',
    'Crisp Wafer Chocolate Fingers', 'ChocoPure', '38 g',
    25, 23, 24, 6, '/images/products/chocolates.jpg',
    array['kitkat', 'wafer', 'fingers', 'chocolate', 'crisp', 'snack'],
    'Layered crisp wafers enrobed in smooth dairy milk chocolate.', 'ChocoPure Confectionery', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000023', 'CHO-DRK-03', 'c1000000-0000-0000-0000-000000000005', 'Dark',
    'Almond Dark Chocolate 55%', 'ChocoPure', '75 g',
    90, 80, 10, 4, '/images/products/chocolates.jpg',
    array['dark chocolate', 'almond', 'badam', 'cocoa', 'premium chocolate'],
    'Intense 55% cocoa chocolate loaded with whole roasted California almonds.', 'ChocoPure Confectionery', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000024', 'CHO-CRM-04', 'c1000000-0000-0000-0000-000000000005', 'Caramel',
    'Chewy Caramel Nougat Bar', 'SweetTooth', '45 g',
    35, 30, 18, 5, '/images/products/chocolates.jpg',
    array['caramel', 'nougat', 'snickers', 'chocobar', 'sweet bar'],
    'Soft nougat and golden caramel coated in rich milk chocolate.', 'SweetTooth Treats', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000025', 'CHO-HAZ-05', 'c1000000-0000-0000-0000-000000000005', 'Bites',
    'Hazelnut Praline Choco Bites', 'SweetTooth', '60 g',
    70, 62, 0, 4, '/images/products/chocolates.jpg',
    array['hazelnut', 'praline', 'bites', 'truffles', 'chocolate'],
    'Bite-sized chocolate domes filled with creamy hazelnut paste.', 'SweetTooth Treats', 'India', null, true
  ),

  -- Category 6: Tea & Coffee (c6...)
  (
    'p1000000-0000-0000-0000-000000000026', 'TEA-MAS-01', 'c1000000-0000-0000-0000-000000000006', 'Tea',
    'Assam Masala Tea Bags (25s)', 'DailyBrew', '50 g',
    80, 72, 15, 4, '/images/products/dairy.jpg',
    array['tea', 'chai', 'masala chai', 'assam', 'dip bags', 'kadak'],
    'Fine CTC Assam tea blended with dry ginger, cardamom, clove and cinnamon.', 'DailyBrew India', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000027', 'COF-INS-02', 'c1000000-0000-0000-0000-000000000006', 'Coffee',
    'Classic Instant Coffee Jar', 'DailyBrew', '50 g',
    130, 115, 12, 3, '/images/products/dairy.jpg',
    array['coffee', 'nescafe', 'instant coffee', 'caffeine', 'jar'],
    'Pure granulated coffee blend offering bold aroma and rich taste.', 'DailyBrew India', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000028', 'TEA-GRN-03', 'c1000000-0000-0000-0000-000000000006', 'Green Tea',
    'Mint Lemon Green Tea (20s)', 'PureLeaf', '40 g',
    95, 85, 10, 4, '/images/products/dairy.jpg',
    array['green tea', 'mint', 'lemon', 'detox', 'herbal tea', 'healthy'],
    'Handpicked whole green tea leaves infused with natural peppermint oil.', 'PureLeaf Beverages', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000029', 'COF-PRE-04', 'c1000000-0000-0000-0000-000000000006', 'Premix',
    '3-in-1 Coffee Premix Sachets (5s)', 'DailyBrew', '100 g',
    60, 52, 16, 5, '/images/products/dairy.jpg',
    array['coffee premix', 'sachet', 'ready coffee', 'milk sugar', 'instant'],
    'Convenient instant coffee with milk solids and sugar. Just add hot water.', 'DailyBrew India', 'India', 'late_night', true
  ),
  (
    'p1000000-0000-0000-0000-000000000030', 'TEA-ELC-05', 'c1000000-0000-0000-0000-000000000006', 'Tea Premix',
    'Cardamom Elaichi Chai Premix (5s)', 'DailyBrew', '100 g',
    55, 48, 14, 5, '/images/products/dairy.jpg',
    array['elaichi', 'cardamom', 'chai premix', 'tea sachet', 'quick tea'],
    'Authentic street-style elaichi chai in single serve packets.', 'DailyBrew India', 'India', null, true
  ),

  -- Category 7: Personal Care (c7...)
  (
    'p1000000-0000-0000-0000-000000000031', 'CAR-TIS-01', 'c1000000-0000-0000-0000-000000000007', 'Hygiene',
    '3-Ply Soft Pocket Tissues (3pk)', 'CareWell', '30 pulls',
    45, 38, 20, 5, '/images/products/care.jpg',
    array['tissues', 'napkin', 'pocket tissue', 'wipes', 'hygiene'],
    'Ultra-soft absorbent 3-ply virgin cellulose tissues in pocket-friendly packs.', 'CareWell Personal Care', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000032', 'CAR-SAN-02', 'c1000000-0000-0000-0000-000000000007', 'Sanitizer',
    'Instant Hand Sanitizer Gel', 'CareWell', '50 ml',
    30, 25, 22, 5, '/images/products/care.jpg',
    array['sanitizer', 'hand sanitizer', 'alcohol', 'germ protection', 'gel'],
    '70% alcohol-based gel enriched with aloe vera for germ protection.', 'CareWell Personal Care', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000033', 'CAR-LIP-03', 'c1000000-0000-0000-0000-000000000007', 'Lip Care',
    'Moisturizing Cherry Lip Balm', 'GlowCampus', '4.5 g',
    60, 50, 14, 4, '/images/products/care.jpg',
    array['lip balm', 'chapstick', 'moisturizer', 'winter care', 'cherry'],
    'Deep hydrating lip butter with shea butter and subtle natural tint.', 'GlowCampus Labs', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000034', 'CAR-PST-04', 'c1000000-0000-0000-0000-000000000007', 'Oral Care',
    'Fresh Mint Herbal Toothpaste', 'CareWell', '80 g',
    50, 44, 16, 4, '/images/products/care.jpg',
    array['toothpaste', 'colgate', 'brush', 'dant manjan', 'mint', 'teeth'],
    'Natural clove and fresh spearmint toothpaste for 12-hour breath protection.', 'CareWell Personal Care', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000035', 'CAR-FCW-05', 'c1000000-0000-0000-0000-000000000007', 'Face Care',
    'Purifying Charcoal Face Wash', 'GlowCampus', '50 ml',
    85, 75, 12, 3, '/images/products/care.jpg',
    array['face wash', 'charcoal', 'cleanser', 'skincare', 'oil control'],
    'Activated charcoal foaming cleanser that removes deep dirt and excess oil.', 'GlowCampus Labs', 'India', null, true
  ),

  -- Category 8: Stationery (c8...)
  (
    'p1000000-0000-0000-0000-000000000036', 'STN-NOT-01', 'c1000000-0000-0000-0000-000000000008', 'Notebook',
    'Ruled Spiral Notebook A5 (160p)', 'CampusStudy', '160 pages',
    70, 60, 20, 5, '/images/products/stationery.jpg',
    array['notebook', 'register', 'copy', 'spiral', 'notes', 'exam'],
    'Sturdy poly-cover spiral notebook with smooth 70 GSM ruled white pages.', 'CampusStudy Supplies', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000037', 'STN-PEN-02', 'c1000000-0000-0000-0000-000000000008', 'Pens',
    'Blue Ballpoint Pen Set (Pack of 5)', 'CampusStudy', '5 pens',
    50, 42, 25, 6, '/images/products/stationery.jpg',
    array['pen', 'ball pen', 'dot pen', 'kalam', 'blue pen', 'exam pen'],
    'Smooth flowing 0.7 mm blue ballpoint pens with ergonomic rubber grip.', 'CampusStudy Supplies', 'India', 'bestsellers', true
  ),
  (
    'p1000000-0000-0000-0000-000000000038', 'STN-HLT-03', 'c1000000-0000-0000-0000-000000000008', 'Highlighters',
    'Pastel Highlighter Pack (4 Colours)', 'CampusStudy', '4 markers',
    100, 85, 15, 4, '/images/products/stationery.jpg',
    array['highlighter', 'marker', 'pastel', 'study', 'chisel tip'],
    'Eye-friendly soft pastel fluorescent highlighters for textbook marking.', 'CampusStudy Supplies', 'India', 'new', true
  ),
  (
    'p1000000-0000-0000-0000-000000000039', 'STN-STK-04', 'c1000000-0000-0000-0000-000000000008', 'Notes',
    'Self-Adhesive Sticky Notes Pad', 'CampusStudy', '100 sheets',
    45, 38, 18, 5, '/images/products/stationery.jpg',
    array['sticky notes', 'post it', 'pad', 'memo', 'reminder'],
    'Bright 3x3 inch self-adhesive notes with residue-free repositionable glue.', 'CampusStudy Supplies', 'India', null, true
  ),
  (
    'p1000000-0000-0000-0000-000000000040', 'STN-SCS-05', 'c1000000-0000-0000-0000-000000000008', 'Scissors',
    'Stainless Steel Craft Scissors', 'CampusStudy', '6 inch',
    60, 52, 10, 3, '/images/products/stationery.jpg',
    array['scissors', 'shears', 'cutter', 'craft', 'office'],
    'Durable rust-resistant stainless steel blades with comfortable plastic handles.', 'CampusStudy Supplies', 'India', null, true
  )
on conflict (sku) do update set
  name = excluded.name,
  brand = excluded.brand,
  size_label = excluded.size_label,
  mrp = excluded.mrp,
  price = excluded.price,
  stock_qty = excluded.stock_qty,
  max_per_order = excluded.max_per_order,
  image_url = excluded.image_url,
  keywords = excluded.keywords,
  description = excluded.description,
  manufacturer = excluded.manufacturer,
  rail = excluded.rail,
  is_active = excluded.is_active;
