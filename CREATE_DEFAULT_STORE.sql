-- Create a default store for testing
-- Replace 'YOUR_USER_ID' with your actual user ID

INSERT INTO "Store" (
  id, 
  name, 
  description, 
  "imageUrl", 
  "coverUrl", 
  location, 
  rating, 
  "reviewCount", 
  "createdAt", 
  "updatedAt", 
  "ownerId"
) VALUES (
  'S-001',
  'Rasaswadaya Official Store',
  'Official store for traditional Sri Lankan cultural products and merchandise',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
  'Colombo, Sri Lanka',
  0,
  0,
  NOW(),
  NOW(),
  'cmlhj03yr0000olbavwnphop7'  -- Replace with your actual user ID
)
ON CONFLICT (id) DO NOTHING;

-- Verify the store was created
SELECT * FROM "Store" WHERE id = 'S-001';
