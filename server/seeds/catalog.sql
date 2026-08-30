INSERT INTO categories (id, slug, name, description)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'seeds', 'Seeds', 'Thoughtfully selected seeds for windowsills, balconies, and garden beds.'),
  ('10000000-0000-4000-8000-000000000002', 'flowers', 'Flowers', 'Fresh floral arrangements made for meaningful everyday moments.'),
  ('10000000-0000-4000-8000-000000000003', 'perfumes', 'Perfumes', 'Botanical fragrances inspired by gardens in bloom.')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO products (
  id, category_id, slug, sku, name, description, price,
  stock_quantity, image_url, featured, is_active
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'blush-garden-bouquet',
    'FLW-BLS-001',
    'Blush Garden Bouquet',
    'A soft gathering of roses, carnations, and seasonal foliage, wrapped by hand for an effortless garden feel.',
    1890.00,
    14,
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=85',
    TRUE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'sunlit-daisy-wrap',
    'FLW-DSY-002',
    'Sunlit Daisy Wrap',
    'Cheerful field daisies and airy greens arranged in a simple kraft wrap.',
    1150.00,
    20,
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85',
    TRUE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'wildflower-table-arrangement',
    'FLW-WLD-003',
    'Wildflower Table Arrangement',
    'A loose, low arrangement of seasonal blooms designed for intimate tables and quiet celebrations.',
    2450.00,
    7,
    'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=1200&q=85',
    FALSE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'heirloom-zinnia-seeds',
    'SED-ZIN-001',
    'Heirloom Zinnia Seeds',
    'A generous mix of warm, jewel-toned zinnias chosen for long flowering and easy cutting.',
    180.00,
    48,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=85',
    TRUE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'sweet-basil-seeds',
    'SED-BSL-002',
    'Sweet Basil Seeds',
    'Fragrant, kitchen-ready basil that grows happily in pots and sunny garden corners.',
    125.00,
    64,
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=85',
    FALSE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    'moonflower-seeds',
    'SED-MNF-003',
    'Moonflower Seeds',
    'Fast-growing vines with luminous evening blooms and a gentle night-time fragrance.',
    210.00,
    31,
    'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=85',
    FALSE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000003',
    'verdant-mist-eau-de-parfum',
    'PRF-VRD-001',
    'Verdant Mist Eau de Parfum',
    'Green leaves, bergamot, and pale woods meet in a cool fragrance with a clean, lingering finish.',
    2850.00,
    12,
    'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
    TRUE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000003',
    'rose-after-rain-eau-de-parfum',
    'PRF-RSE-002',
    'Rose After Rain Eau de Parfum',
    'Dewy rose petals, pink pepper, and soft musk evoke a garden just after a warm shower.',
    3150.00,
    9,
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85',
    TRUE,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000003',
    'amber-petal-eau-de-parfum',
    'PRF-AMB-003',
    'Amber Petal Eau de Parfum',
    'A warm blend of orange blossom, amber, and vanilla made for slow golden evenings.',
    2950.00,
    16,
    'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=85',
    FALSE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  slug = EXCLUDED.slug,
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock_quantity = EXCLUDED.stock_quantity,
  image_url = EXCLUDED.image_url,
  featured = EXCLUDED.featured,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;
