
-- 1) Categories
CREATE TABLE public.gallery_categories (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  label TEXT NOT NULL,
  unsplash_query TEXT,
  position INT NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_categories TO anon, authenticated;
GRANT ALL ON public.gallery_categories TO service_role;

ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_categories public read"
  ON public.gallery_categories FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "gallery_categories admin insert"
  ON public.gallery_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_categories admin update"
  ON public.gallery_categories FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_categories admin delete"
  ON public.gallery_categories FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) Items
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.gallery_categories(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('unsplash','manual')),
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  unsplash_id TEXT,
  photographer_name TEXT,
  photographer_url TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX gallery_items_unsplash_unique
  ON public.gallery_items (category_id, unsplash_id)
  WHERE unsplash_id IS NOT NULL;

CREATE INDEX gallery_items_category_idx
  ON public.gallery_items (category_id, source, position);

GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT ALL ON public.gallery_items TO service_role;

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_items public read"
  ON public.gallery_items FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "gallery_items admin insert"
  ON public.gallery_items FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_items admin update"
  ON public.gallery_items FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_items admin delete"
  ON public.gallery_items FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3) updated_at trigger for categories
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER gallery_categories_set_updated_at
  BEFORE UPDATE ON public.gallery_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Seed initial categories
INSERT INTO public.gallery_categories (id, group_id, emoji, label, unsplash_query, position) VALUES
  -- Natural wonders
  ('maldives',     'natural',   '🏝️', 'Tropical Coast (Maldives)', 'maldives overwater villa turquoise', 1),
  ('seychelles',   'natural',   '🌊', 'Seychelles Paradise',       'seychelles beach granite paradise', 2),
  ('bali',         'natural',   '🌴', 'Bali Luxury',               'bali tropical luxury resort',       3),
  ('bora-bora',    'natural',   '🐚', 'Bora Bora Lagoon',          'bora bora lagoon overwater',        4),
  ('amazon',       'natural',   '🌲', 'Mystic Forest (Amazon)',    'amazon rainforest mystic fog',      5),
  ('alps',         'natural',   '🏔️', 'Swiss Alps Snowy Peak',     'swiss alps snowy peak sunrise',     6),
  ('roses',        'natural',   '🌹', 'Royal Rose Garden',         'royal rose garden bloom',           7),
  ('cherry',       'natural',   '🌸', 'Cherry Blossom',            'cherry blossom sakura pastel',      8),
  -- Capitals & iconic
  ('paris',        'capitals',  '🗼', 'Paris (Eiffel Luxury)',     'paris eiffel tower luxury sunset',  10),
  ('nyc',          'capitals',  '🗽', 'New York (Times Square)',   'new york times square skyline night',11),
  ('dubai',        'capitals',  '🏙️', 'Dubai (Golden Night)',      'dubai skyline burj khalifa golden', 12),
  ('tokyo',        'capitals',  '🔮', 'Tokyo Neon Cyberpunk',      'tokyo neon cyberpunk night street',  13),
  ('london',       'capitals',  '🎡', 'London',                    'london big ben thames sunset',      14),
  ('santorini',    'capitals',  '🤍', 'Santorini',                 'santorini white blue oia',          15),
  ('rome',         'capitals',  '🏛️', 'Rome',                      'rome colosseum golden hour',        16),
  -- Premium e-commerce studios
  ('marble',       'studios',   '🏛️', 'Marble & Gold Minimalist',  'marble gold luxury product studio', 20),
  ('boho',         'studios',   '🪞', 'Boho Soft Light',           'boho pampas grass soft studio',     21),
  ('pampas',       'studios',   '🌾', 'Pampas Wooden Table',       'pampas wooden table sunlight',      22),
  ('minimal',      'studios',   '⚪', 'Minimalist White',          'minimalist white product photography',23),
  ('dark-luxury',  'studios',   '🖤', 'Dark Luxury',               'dark luxury product photography moody',24),
  -- Masculine / loft
  ('loft',         'masculine', '🛋️', 'Loft Industrial',           'loft industrial dark brick interior',30),
  ('garage',       'masculine', '🔧', 'Garage Workshop',           'garage workshop tools rustic',      31),
  -- Pets
  ('pets-studio',  'pets',      '🐶', 'Pets Studio',               'pet portrait studio backdrop',      40),
  ('pets-cozy',    'pets',      '🐾', 'Pets Cozy Home',            'cozy pet home blanket soft',        41),
  -- Baby / kids
  ('baby-pastel',  'baby',      '👶', 'Baby Pastel Nursery',       'baby nursery soft pastel',          50),
  ('baby-toys',    'baby',      '🧸', 'Baby Toys Scene',           'baby toys soft pastel scene',       51),
  -- Special (manual-only)
  ('dubai-garden', 'special',   '🌺', 'Dubai Miracle Garden',      NULL,                                60);
