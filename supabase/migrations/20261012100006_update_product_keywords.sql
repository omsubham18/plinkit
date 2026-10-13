-- Migration: 20261012100006_update_product_keywords.sql
-- Description: Add 3 to 6 alias keywords (generic names, common misspellings, Hinglish) to all 40 seed products.
-- Spec: docs/SPEC.md Section 8 (Search aliases, misspellings, Hinglish terms).

update public.products set keywords = array['chips', 'potato', 'namkeen', 'chipsi', 'aloo chips', 'wafers', 'crisps', 'lays']
where sku = 'CHP-CLS-01';

update public.products set keywords = array['masala', 'spicy', 'chilli', 'namkeen', 'teekha', 'mirchi', 'kurkure', 'chips']
where sku = 'CHP-MAS-02';

update public.products set keywords = array['cheese', 'puffs', 'corn', 'cheesy', 'cheese balls', 'kurkure', 'snack']
where sku = 'CHP-CRN-03';

update public.products set keywords = array['nachos', 'tortilla', 'doritos', 'corn chips', 'jalapeno', 'mexican']
where sku = 'CHP-NCH-04';

update public.products set keywords = array['peanuts', 'moongphali', 'mungfali', 'singdana', 'salted nuts', 'chakhna']
where sku = 'CHP-PNT-05';

update public.products set keywords = array['cola', 'coke', 'cold drink', 'thanda', 'pepsi', 'thumsup', 'soda']
where sku = 'DRK-COL-01';

update public.products set keywords = array['lemon', 'lime', 'sprite', '7up', 'nimbu', 'cold drink', 'soda']
where sku = 'DRK-LEM-02';

update public.products set keywords = array['mango', 'aam', 'frooti', 'maaza', 'slice', 'juice', 'cold drink']
where sku = 'DRK-MNG-03';

update public.products set keywords = array['coffee', 'cold coffee', 'frappe', 'mocha', 'caffeine', 'doodh', 'milk']
where sku = 'DRK-COF-04';

update public.products set keywords = array['iced tea', 'peach tea', 'black tea', 'cold tea', 'lipton', 'thanda chai']
where sku = 'DRK-TEA-05';

update public.products set keywords = array['maggi', 'magi', 'noodles', 'nudles', 'ramen', 'chowmein', '2 minute']
where sku = 'NDL-MAS-01';

update public.products set keywords = array['atta maggi', 'wheat noodles', 'veggie maggi', 'healthy noodles', 'magi']
where sku = 'NDL-ATT-02';

update public.products set keywords = array['ramen', 'korean ramen', 'spicy noodles', 'buldak', 'shin ramen', 'hot noodles']
where sku = 'NDL-SPY-03';

update public.products set keywords = array['cup noodles', 'cup maggi', 'instant noodles', 'ready to eat', 'nissin', 'hot water']
where sku = 'NDL-CUP-04';

update public.products set keywords = array['schezwan', 'schezwan noodles', 'spicy chowmein', 'chinese noodles', 'desichinese']
where sku = 'NDL-SCH-05';

update public.products set keywords = array['cookies', 'biscuit', 'biskit', 'choco chip', 'hide and seek', 'choclate biscuit']
where sku = 'BSC-CHK-01';

update public.products set keywords = array['parle g', 'glucose', 'chai biscuit', 'biskit', 'biscuit', 'energy biscuit']
where sku = 'BSC-GLU-02';

update public.products set keywords = array['kaju biscuit', 'cashew cookies', 'butter cookies', 'good day', 'biskit', 'cookies']
where sku = 'BSC-CSH-03';

update public.products set keywords = array['crackers', 'monaco', 'salted biscuit', 'snack biscuit', '50 50', 'biskit']
where sku = 'BSC-CRK-04';

update public.products set keywords = array['digestive', 'nutrichoice', 'wheat biscuit', 'healthy biscuit', 'atta biscuit', 'fibre']
where sku = 'BSC-DIG-05';

update public.products set keywords = array['chocolate', 'choclate', 'dairy milk', 'mithai', 'sweet', 'cadbury']
where sku = 'CHO-MLK-01';

update public.products set keywords = array['kitkat', 'munch', 'wafer chocolate', 'choclate wafer', 'crisp', 'chocolate']
where sku = 'CHO-WFR-02';

update public.products set keywords = array['dark chocolate', 'bournville', 'amul dark', 'bitter chocolate', 'almond chocolate', 'badam']
where sku = 'CHO-DRK-03';

update public.products set keywords = array['snickers', '5 star', 'bar-one', 'caramel chocolate', 'nougat bar', 'chocolate']
where sku = 'CHO-CRM-04';

update public.products set keywords = array['ferrero', 'hazelnut', 'praline', 'truffles', 'choclate balls', 'chocolate']
where sku = 'CHO-HAZ-05';

update public.products set keywords = array['chai', 'chaye', 'tea', 'masala chai', 'assam tea', 'kadak chai', 'patti']
where sku = 'TEA-MAS-01';

update public.products set keywords = array['nescafe', 'bru', 'coffee powder', 'instant coffee', 'filter coffee', 'caffeine']
where sku = 'COF-INS-02';

update public.products set keywords = array['green tea', 'detox tea', 'herbal tea', 'mint tea', 'lemon tea', 'healthy']
where sku = 'TEA-GRN-03';

update public.products set keywords = array['ready coffee', 'premix coffee', 'sachet', 'instant coffee', 'doodh coffee', 'milk coffee']
where sku = 'COF-PRE-04';

update public.products set keywords = array['elaichi chai', 'cardamom tea', 'ready chai', 'premix chai', 'girnar', 'tea sachet']
where sku = 'TEA-ELC-05';

update public.products set keywords = array['tissue', 'tissues', 'napkin', 'rumal', 'wipes', 'pocket tissue', 'hygiene']
where sku = 'CAR-TIS-01';

update public.products set keywords = array['sanitizer', 'lifebuoy', 'dettol', 'germs', 'handwash', 'cleaner', 'alcohol']
where sku = 'CAR-SAN-02';

update public.products set keywords = array['lip balm', 'chapstick', 'nivea', 'vaseline', 'lip care', 'dry lips']
where sku = 'CAR-LIP-03';

update public.products set keywords = array['colgate', 'pepsodent', 'dantkanti', 'toothpaste', 'dant manjan', 'brush', 'teeth']
where sku = 'CAR-PST-04';

update public.products set keywords = array['face wash', 'facewash', 'garnier', 'himalaya', 'soap', 'charcoal face', 'sabun']
where sku = 'CAR-FCW-05';

update public.products set keywords = array['register', 'copy', 'notebook', 'notes', 'spiral book', 'classmate', 'exam']
where sku = 'STN-NOT-01';

update public.products set keywords = array['pen', 'ball pen', 'dot pen', 'blue pen', 'kalam', 'reynolds', 'cello']
where sku = 'STN-PEN-02';

update public.products set keywords = array['highlighter', 'marker', 'marker pen', 'fluorescent', 'study notes', 'pastel']
where sku = 'STN-HLT-03';

update public.products set keywords = array['sticky notes', 'post it', 'sticky note', 'pad', 'bookmark', 'memo']
where sku = 'STN-STK-04';

update public.products set keywords = array['scissors', 'cutter', 'scissor', 'shears', 'kainchi', 'craft']
where sku = 'STN-SCS-05';
