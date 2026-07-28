INSERT INTO public.gallery_categories (id, group_id, emoji, label, unsplash_query, position) VALUES
  ('scandi-minimal', 'studios', '🤍', 'Scandinavian Minimal',  'scandinavian minimalist product photography soft light beige', 25),
  ('scandi-marble',  'studios', '🪨', 'Scandi Marble Podium',  'minimalist marble podium product display soft shadow neutral', 26),
  ('scandi-wood',    'studios', '🌿', 'Nordic Wood & Eucalyptus', 'scandinavian product photography eucalyptus pale wood window light', 27),
  ('scandi-beton',   'studios', '🏛️', 'Soft Concrete Studio',   'minimalist concrete backdrop product photography soft daylight beige', 28)
ON CONFLICT (id) DO UPDATE
  SET group_id = EXCLUDED.group_id,
      emoji = EXCLUDED.emoji,
      label = EXCLUDED.label,
      unsplash_query = EXCLUDED.unsplash_query,
      position = EXCLUDED.position;