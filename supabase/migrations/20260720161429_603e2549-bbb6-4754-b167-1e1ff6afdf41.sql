-- 1) Add background_prompt column for AI engine (BRIA/Flux) composition wiring
ALTER TABLE public.gallery_categories
  ADD COLUMN IF NOT EXISTS background_prompt TEXT;

-- 2) Delete legacy default categories (kept only the new 46 premium groups)
DELETE FROM public.gallery_items
 WHERE category_id IN (
   SELECT id FROM public.gallery_categories
    WHERE group_id IN ('baby','capitals','natural','masculine','pets','special','studios')
 );

DELETE FROM public.gallery_categories
 WHERE group_id IN ('baby','capitals','natural','masculine','pets','special','studios');

-- 3) Seed background_prompt for every remaining category (English, Flux-friendly)
UPDATE public.gallery_categories SET background_prompt = CASE id
  -- E-COMMERCE
  WHEN 'cosmetics-studio'    THEN 'clean minimal beauty studio background, soft diffused light, marble podium, subtle pastel gradient, professional product photography, sharp focus'
  WHEN 'beverage-food'       THEN 'appetizing food styling background, natural daylight, rustic wooden or marble surface, soft shadows, editorial magazine look'
  WHEN 'luxury-perfumes'     THEN 'luxury perfume ad background, glossy marble podium, gold accents, deep burgundy gradient, dramatic soft lighting, high-end fragrance campaign'
  WHEN 'eshop-flatlays'      THEN 'clean overhead flat lay background, neutral seamless paper, soft even lighting, subtle shadow, ecommerce catalog style'
  WHEN 'industrial-studio'   THEN 'industrial concrete studio, seamless grey backdrop, hard soft-box lighting, professional product shoot'
  WHEN 'marketplace-sales'   THEN 'bright pure white seamless marketplace background, no shadow, catalog-ready ecommerce listing photo'
  WHEN 'promo-badges'        THEN 'vibrant promotional background, bold color gradient, sale-poster vibe, dynamic light streaks'
  WHEN 'black-friday'        THEN 'black friday sale background, deep matte black, dramatic red and gold accents, luxury sale campaign'
  -- SEASONAL
  WHEN 'valentines-day'      THEN 'romantic valentines background, soft pink and red bokeh, rose petals, warm dreamy light'
  WHEN 'mothers-day'         THEN 'soft floral mother''s day background, pastel pink and cream, delicate flowers, warm natural light'
  WHEN 'womens-day'          THEN 'elegant women''s day background, purple and gold accents, soft mimosa flowers, empowering feminine tone'
  WHEN 'christmas-specials'  THEN 'cozy christmas background, warm bokeh fairy lights, pine branches, red and gold ornaments, snow accents'
  WHEN 'autumn-fashion'      THEN 'moody autumn background, warm ochre and burnt orange leaves, soft golden hour light'
  WHEN 'spring-summer'       THEN 'fresh spring background, pastel blossoms, soft sunlight, airy bright atmosphere'
  WHEN 'back-to-school'      THEN 'back to school background, clean pastel desk, notebooks and stationery, cheerful bright light'
  WHEN 'st-patricks-pride'   THEN 'festive celebration background, vibrant green or rainbow gradient, confetti, joyful atmosphere'
  WHEN 'halloween'           THEN 'spooky halloween background, deep purple and orange, misty fog, pumpkins silhouette, cinematic mood'
  -- CREATIVE
  WHEN 'id-passport'         THEN 'plain neutral photo background, uniform light grey or white, even soft lighting, official id photo standard'
  WHEN 'modern-art-vangogh'  THEN 'painterly artistic background, van gogh style thick brush strokes, swirling starry colors, textured canvas'
  WHEN 'automotive-sports'   THEN 'dynamic automotive background, motion blur asphalt, dramatic lighting, sports arena vibe'
  WHEN 'pet-studio'          THEN 'clean bright pet studio background, seamless pastel backdrop, soft natural light'
  WHEN 'dating-portrait'     THEN 'romantic portrait background, warm bokeh, cinematic golden hour, soft shallow depth of field'
  WHEN 'festival-overlays'   THEN 'festival stage background, colorful bokeh lights, energetic crowd blur, cinematic atmosphere'
  -- MARKETPLACES
  WHEN 'marketplace-presets' THEN 'seamless white marketplace background, pure #ffffff, no shadow, listing-ready ecommerce photo'
  WHEN 'multi-angle-grids'   THEN 'clean neutral grey seamless background, even studio lighting, multi-angle product grid ready'
  WHEN 'marble-wood-flatlays' THEN 'flat lay on marble and light oak wood, soft daylight, minimal props, magazine flatlay'
  WHEN 'skincare-beauty'     THEN 'clean skincare background, soft cream gradient, water droplets, glossy minimal beauty aesthetic'
  WHEN 'footwear-studio'     THEN 'premium sneaker studio background, gradient charcoal to graphite, dramatic side light, hero product shot'
  WHEN 'home-decor'          THEN 'stylish scandinavian living room background, soft daylight, neutral tones, decor styling'
  WHEN 'bakery-food-menus'   THEN 'artisan bakery background, rustic wood and linen, warm ambient light, appetizing menu look'
  WHEN 'multi-product-moods' THEN 'moody editorial background, deep neutral gradient, cinematic soft light, versatile multi-product mood'
  -- SOCIAL & CORPORATE
  WHEN 'video-thumbnails'    THEN 'bold youtube thumbnail background, high contrast vibrant gradient, dynamic light rays, attention-grabbing'
  WHEN 'corporate-teams'     THEN 'clean corporate office background, soft grey wall, natural window light, professional headshot vibe'
  WHEN 'social-aspect-ratios' THEN 'versatile instagram story background, soft gradient, minimal geometric shapes, mobile-first composition'
  WHEN 'social-proof-reviews' THEN 'trustworthy testimonial background, soft cream, subtle stars accent, warm friendly tone'
  WHEN 'professional-avatars' THEN 'professional linkedin avatar background, neutral soft grey gradient, soft rim light'
  WHEN 'logo-mockups'        THEN 'clean brand mockup background, minimal white surface, subtle soft shadow, presentation-ready'
  -- FOUNDATIONS / LIFESTYLE
  WHEN 'kids-baby'           THEN 'soft pastel nursery background, gentle cream and mint, cozy natural light'
  WHEN 'magazine-covers'     THEN 'editorial vogue magazine background, bold color block, dramatic studio light, high-fashion cover'
  WHEN 'retro-thrift'        THEN '70s retro thrift background, warm mustard and brown tones, film grain texture, vintage vibe'
  WHEN 'travel-wedding'      THEN 'romantic destination wedding background, sun-kissed beach or tuscan villa, soft golden light'
  WHEN 'athletic-fitness'    THEN 'high energy gym background, dark concrete, dramatic red accent light, athletic performance vibe'
  WHEN 'eco-nature'          THEN 'natural eco background, fresh green leaves, soft daylight, organic sustainable aesthetic'
  WHEN 'neon-vibrant'        THEN 'cyberpunk neon background, vibrant magenta and cyan, glowing light streaks, urban night mood'
  WHEN 'basic-core'          THEN 'seamless neutral studio background, pure light grey, soft even lighting, universal product shot'
  WHEN 'classic-filters'     THEN 'timeless portrait background, warm sepia gradient, soft vignette, classic film look'
  ELSE background_prompt
END
WHERE background_prompt IS NULL;