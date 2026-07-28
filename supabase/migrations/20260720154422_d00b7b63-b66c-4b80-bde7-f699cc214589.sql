
-- Master Library category map (Part 1 + Part 2). Idempotent upsert.
-- Uses existing gallery_categories schema. All queries are landscape-friendly
-- English keywords tuned for Unsplash search relevance.

INSERT INTO public.gallery_categories (id, group_id, emoji, label, unsplash_query, position) VALUES
-- ========== 1. E-COMMERCE & COMMERCIAL ==========
('cosmetics-studio',    'ecommerce', '💄', 'Cosmetics Studio',        'cosmetics cream marble minimalist product photography',        100),
('beverage-food',       'ecommerce', '🍔', 'Beverage & Food',         'fresh fruit kitchen counter food photography',                 101),
('luxury-perfumes',     'ecommerce', '🧴', 'Luxury Perfumes',         'perfume bottle marble podium luxury',                          102),
('eshop-flatlays',      'ecommerce', '👕', 'eShop Flat Lays',         'folded shirt flat lay soft shadow ecommerce',                  103),
('industrial-studio',   'ecommerce', '🏭', 'Industrial Studio',       'concrete industrial studio backdrop brutalist',                104),
('marketplace-sales',   'ecommerce', '👗', 'Marketplace Sales',       'pastel color block fashion catalog backdrop',                  105),
('promo-badges',        'ecommerce', '🏷️', 'Promo & Badges',          'sale discount 50 percent off banner background',              106),
('black-friday',        'ecommerce', '🖤', 'Black Friday & Cyber',    'black friday neon dark high contrast sale banner',            107),

-- ========== 2. SEASONAL & HOLIDAYS ==========
('valentines-day',      'seasonal',  '💝', 'Valentine''s Day',        'valentines day red pink hearts romantic background',           200),
('mothers-day',         'seasonal',  '🌷', 'Mother''s Day',           'mothers day flowers warm soft background',                     201),
('womens-day',          'seasonal',  '👩', 'Women''s Day',            'international womens day floral background',                   202),
('christmas-specials',  'seasonal',  '🎄', 'Christmas Specials',      'christmas snow pine tree cozy holiday background',             203),
('autumn-fashion',      'seasonal',  '🍂', 'Autumn Fashion',          'autumn leaves cinnamon warm fashion background',               204),
('spring-summer',       'seasonal',  '🌼', 'Spring & Summer',         'summer beach picnic pastel fresh background',                  205),
('back-to-school',      'seasonal',  '🎒', 'Back to School',          'back to school notebooks pencils desk',                        206),
('st-patricks-pride',   'seasonal',  '🌈', 'St. Patricks & Pride',    'rainbow pride festival colorful background',                   207),
('halloween',           'seasonal',  '🎃', 'Halloween',               'halloween pumpkin dark moody foggy background',                208),

-- ========== 3. CREATIVE & NICHE ==========
('id-passport',         'creative',  '🪪', 'ID & Passport Photo',     'plain white studio backdrop portrait',                         300),
('modern-art-vangogh',  'creative',  '🎨', 'Modern Art & Van Gogh',   'van gogh oil painting texture background',                     301),
('automotive-sports',   'creative',  '🏎️', 'Automotive & Sports',    'race track formula 1 dynamic background',                     302),
('pet-studio',          'creative',  '🐾', 'Pet Studio',              'cute pet portrait colorful studio backdrop',                   303),
('dating-portrait',     'creative',  '💫', 'Dating & Portraits',      'lifestyle portrait soft bokeh background',                     304),
('festival-overlays',   'creative',  '🎉', 'Festival & Event',        'concert festival stage lights background',                     305),

-- ========== 4. ADVANCED E-COM & MARKETPLACES ==========
('marketplace-presets', 'marketplaces', '🛒', 'Marketplace Presets',   'ecommerce product white background catalog',                  400),
('multi-angle-grids',   'marketplaces', '💍', 'Multi-Angle Grids',     'jewelry rings macro product photography grid',                401),
('marble-wood-flatlays','marketplaces', '🪵', 'Marble & Wood Flatlays','marble wood flat lay premium product',                        402),
('skincare-beauty',     'marketplaces', '💅', 'Skincare & Beauty',     'skincare serum nail art beauty product photography',          403),
('footwear-studio',     'marketplaces', '👟', 'Footwear Studio',       'sneakers colorful studio floor product',                      404),
('home-decor',          'marketplaces', '🛋️', 'Home Decor',            'living room lamp vase interior styling',                     405),
('bakery-food-menus',   'marketplaces', '🥐', 'Bakery & Food Menus',   'cafe bakery cupcake donut coffee menu',                       406),
('multi-product-moods', 'marketplaces', '👜', 'Multi-Product Moods',   'fashion accessories moodboard flat lay',                      407),

-- ========== 5. SOCIAL & CORPORATE ==========
('video-thumbnails',    'social',    '🎬', 'Video Thumbnails',        'youtube thumbnail dynamic background creator',                 500),
('corporate-teams',     'social',    '💼', 'Corporate Teams',         'corporate office team meeting background',                     501),
('social-aspect-ratios','social',    '📱', 'Social Aspect Ratios',    'instagram tiktok social media abstract background',            502),
('social-proof-reviews','social',    '⭐', 'Social Proof & Reviews',  'five star review testimonial infographic background',          503),
('professional-avatars','social',    '🙂', 'Professional Avatars',    'professional headshot colorful gradient background',           504),
('logo-mockups',        'social',    '🏷️', 'Logo Mockups',            'brand logo mockup signage textile',                          505),

-- ========== 6. FOUNDATIONS & LIFESTYLE ==========
('kids-baby',           'foundations', '🍼', 'Kids & Baby',            'baby nursery pastel toys announcement',                       600),
('magazine-covers',     'foundations', '📖', 'Magazine Covers',        'fashion magazine cover editorial background',                 601),
('retro-thrift',        'foundations', '🧥', 'Retro & Thrift',         'vintage thrift retro fashion background',                     602),
('travel-wedding',      'foundations', '💒', 'Travel & Wedding',       'wedding bride portrait luxury travel background',             603),
('athletic-fitness',    'foundations', '🏃', 'Athletic & Fitness',     'running basketball soccer fitness dynamic background',        604),
('eco-nature',          'foundations', '🍀', 'Eco-Friendly Nature',    'green leaves organic natural light background',               605),
('neon-vibrant',        'foundations', '💡', 'Neon & Vibrant',         'neon glowing vibrant high contrast background',               606),
('basic-core',          'foundations', '⬜', 'Basic Core',             'plain white transparent studio background',                   607),
('classic-filters',     'foundations', '📷', 'Classic Photo Filters',  'black and white sepia classic photography background',        608)

ON CONFLICT (id) DO UPDATE SET
  group_id       = EXCLUDED.group_id,
  emoji          = EXCLUDED.emoji,
  label          = EXCLUDED.label,
  unsplash_query = EXCLUDED.unsplash_query,
  position       = EXCLUDED.position;
