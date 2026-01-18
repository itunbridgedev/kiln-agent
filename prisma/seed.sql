-- Seed script for development database
-- Creates test admin user, categories, and products

-- 1. Create admin role if it doesn't exist
INSERT INTO "Role" (name) 
VALUES ('admin') 
ON CONFLICT (name) DO NOTHING;

-- 2. Create test admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO "Customer" (name, email, "passwordHash", "agreedToTerms", "agreedToSms", "createdAt", "updatedAt")
VALUES (
  'Admin User',
  'admin@kilnagent.com',
  '$2b$10$4KBM1kT2FTgKlBxecPKD3eZutcKOvQmP7mBvk9Miew0KP4khmZiCO',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 3. Assign admin role to test user
INSERT INTO "CustomerRole" ("customerId", "roleId")
SELECT c.id, r.id 
FROM "Customer" c, "Role" r
WHERE c.email = 'admin@kilnagent.com' 
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 4. Create product categories
INSERT INTO "ProductCategory" (name, description, "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES 
  ('Classes', 'Pottery classes and workshops for all skill levels', 1, true, NOW(), NOW()),
  ('Materials', 'Clay, glazes, and other pottery materials', 2, true, NOW(), NOW()),
  ('Firing Services', 'Kiln firing services for your pottery pieces', 3, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 5. Create products
INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '2 Hr Intro to Wheel Course',
  'Perfect for beginners! Learn the basics of wheel throwing in this hands-on 2-hour introductory course.',
  50.00,
  cat.id,
  NULL,
  1,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Classes'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '8 Week Beginner Wheel Course',
  'Comprehensive 8-week course covering all fundamentals of pottery wheel throwing.',
  320.00,
  cat.id,
  NULL,
  2,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Classes'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  'Hand Building Workshop',
  '4-hour workshop focused on hand building techniques including pinch, coil, and slab methods.',
  75.00,
  cat.id,
  NULL,
  3,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Classes'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '25 lb. Bag of SmoothStone Clay',
  'High-quality stoneware clay, perfect for wheel throwing and hand building. Fires to cone 6.',
  35.00,
  cat.id,
  NULL,
  1,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Materials'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '50 lb. Bag of Porcelain Clay',
  'Premium porcelain clay for fine pottery work. Smooth texture, fires to brilliant white.',
  65.00,
  cat.id,
  NULL,
  2,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Materials'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  'Glaze Sample Set (6 colors)',
  'Set of 6 popular glaze colors in 4oz containers. Perfect for testing and small projects.',
  45.00,
  cat.id,
  NULL,
  3,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Materials'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '1/2 Tray Bisque Firing',
  'Bisque firing service for up to half a kiln shelf of greenware pieces.',
  25.00,
  cat.id,
  NULL,
  1,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Firing Services'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  'Full Tray Bisque Firing',
  'Bisque firing service for a full kiln shelf of greenware pieces.',
  45.00,
  cat.id,
  NULL,
  2,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Firing Services'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  '1/2 Tray Glaze Firing',
  'Glaze firing service for up to half a kiln shelf of bisque-fired pieces.',
  30.00,
  cat.id,
  NULL,
  3,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Firing Services'
ON CONFLICT DO NOTHING;

INSERT INTO "Product" (name, description, price, "categoryId", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  'Full Tray Glaze Firing',
  'Glaze firing service for a full kiln shelf of bisque-fired pieces.',
  55.00,
  cat.id,
  NULL,
  4,
  true,
  NOW(),
  NOW()
FROM "ProductCategory" cat
WHERE cat.name = 'Firing Services'
ON CONFLICT DO NOTHING;

-- Display summary
SELECT 'Seed script completed!' as status;
SELECT COUNT(*) as user_count FROM "Customer" WHERE email = 'admin@kilnagent.com';
SELECT COUNT(*) as category_count FROM "ProductCategory";
SELECT COUNT(*) as product_count FROM "Product";
