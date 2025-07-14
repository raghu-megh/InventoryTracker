-- First, let's find the Margherita Pizza menu item
SELECT id, name, "cloverItemId" FROM menu_items WHERE name LIKE '%Margherita%';

-- Check what raw materials are available
SELECT id, name, unit, "currentStock" FROM raw_materials WHERE "restaurantId" = '51bf1689-55d5-451a-818f-23fc9a4098c6';

-- Check if we have some basic ingredients, if not we'll create them
SELECT id, name FROM raw_material_categories WHERE "restaurantId" = '51bf1689-55d5-451a-818f-23fc9a4098c6';