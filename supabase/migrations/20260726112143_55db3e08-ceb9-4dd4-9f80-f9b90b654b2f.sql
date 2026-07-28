
INSERT INTO public.gallery_categories (id, group_id, emoji, label, unsplash_query, background_prompt, position)
VALUES
  ('human-models', 'humans', '🧍', 'Human & Apparel Models', 'fashion model studio portrait apparel', 'professional studio fashion model, clean neutral backdrop, soft even light, editorial catalog composition', 110)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  emoji = EXCLUDED.emoji,
  label = EXCLUDED.label,
  background_prompt = EXCLUDED.background_prompt,
  position = EXCLUDED.position;

DELETE FROM public.gallery_items WHERE category_id = 'human-models' AND source = 'manual';

INSERT INTO public.gallery_items (category_id, source, image_url, thumb_url, photographer_name, position) VALUES
  ('human-models','manual','/__l5e/assets-v1/e68918d8-9d31-4702-8c7b-853328775e5c/full_female_light.jpg','/__l5e/assets-v1/e68918d8-9d31-4702-8c7b-853328775e5c/full_female_light.jpg','BG Removify Studio',0),
  ('human-models','manual','/__l5e/assets-v1/7707287a-0f57-4d0a-9b41-013a584e82e8/full_female_wheat.jpg','/__l5e/assets-v1/7707287a-0f57-4d0a-9b41-013a584e82e8/full_female_wheat.jpg','BG Removify Studio',1),
  ('human-models','manual','/__l5e/assets-v1/a246c1db-d658-4b4e-a31e-d06029703477/full_female_dark.jpg','/__l5e/assets-v1/a246c1db-d658-4b4e-a31e-d06029703477/full_female_dark.jpg','BG Removify Studio',2),
  ('human-models','manual','/__l5e/assets-v1/6804c156-dc2a-41bf-96a8-b533d1cda58c/full_adult_male_light.jpg','/__l5e/assets-v1/6804c156-dc2a-41bf-96a8-b533d1cda58c/full_adult_male_light.jpg','BG Removify Studio',3),
  ('human-models','manual','/__l5e/assets-v1/7a0e2903-7c21-4b1c-ad16-b9c3f9a2a9ba/full_adult_male_wheat.jpg','/__l5e/assets-v1/7a0e2903-7c21-4b1c-ad16-b9c3f9a2a9ba/full_adult_male_wheat.jpg','BG Removify Studio',4),
  ('human-models','manual','/__l5e/assets-v1/e7106b1a-b06e-4bd8-bf6f-039208f17836/full_adult_male_dark.jpg','/__l5e/assets-v1/e7106b1a-b06e-4bd8-bf6f-039208f17836/full_adult_male_dark.jpg','BG Removify Studio',5),
  ('human-models','manual','/__l5e/assets-v1/59302a8d-e0ba-4f52-b4b2-64e0ddaa5ce9/full_male_jeans_light.jpg','/__l5e/assets-v1/59302a8d-e0ba-4f52-b4b2-64e0ddaa5ce9/full_male_jeans_light.jpg','BG Removify Studio',6),
  ('human-models','manual','/__l5e/assets-v1/e6e0be16-7a9c-4aca-8a01-2319ceaa0b02/full_male_shorts_wheat.jpg','/__l5e/assets-v1/e6e0be16-7a9c-4aca-8a01-2319ceaa0b02/full_male_shorts_wheat.jpg','BG Removify Studio',7),
  ('human-models','manual','/__l5e/assets-v1/97dc3aee-12df-4b37-af49-49cb4ae9770c/full_female_jeans_light.jpg','/__l5e/assets-v1/97dc3aee-12df-4b37-af49-49cb4ae9770c/full_female_jeans_light.jpg','BG Removify Studio',8),
  ('human-models','manual','/__l5e/assets-v1/d530a2bd-47fb-4d18-b209-7e21df0f2b34/full_female_shorts_wheat.jpg','/__l5e/assets-v1/d530a2bd-47fb-4d18-b209-7e21df0f2b34/full_female_shorts_wheat.jpg','BG Removify Studio',9),
  ('human-models','manual','/__l5e/assets-v1/f4bdbf12-a63c-426d-9c17-74b53b39d0f9/bust_woman_fair.jpg','/__l5e/assets-v1/f4bdbf12-a63c-426d-9c17-74b53b39d0f9/bust_woman_fair.jpg','BG Removify Studio',10),
  ('human-models','manual','/__l5e/assets-v1/7a6764c9-eab4-4dda-a88f-963ed1724830/bust_woman_dark.jpg','/__l5e/assets-v1/7a6764c9-eab4-4dda-a88f-963ed1724830/bust_woman_dark.jpg','BG Removify Studio',11),
  ('human-models','manual','/__l5e/assets-v1/8a7dfa5e-d83c-4b9f-b7ea-4cfe3fc3a741/bust_man_fair.jpg','/__l5e/assets-v1/8a7dfa5e-d83c-4b9f-b7ea-4cfe3fc3a741/bust_man_fair.jpg','BG Removify Studio',12),
  ('human-models','manual','/__l5e/assets-v1/39aeccdf-d422-4d9f-8e09-3d4d295ec7dd/bust_man_dark.jpg','/__l5e/assets-v1/39aeccdf-d422-4d9f-8e09-3d4d295ec7dd/bust_man_dark.jpg','BG Removify Studio',13),
  ('human-models','manual','/__l5e/assets-v1/70ec87e0-bf23-4a92-85ba-ae5f89e68634/head_female_light.jpg','/__l5e/assets-v1/70ec87e0-bf23-4a92-85ba-ae5f89e68634/head_female_light.jpg','BG Removify Studio',14),
  ('human-models','manual','/__l5e/assets-v1/acaf9504-6f15-48ff-a2fb-787a94eb0f1f/head_adult_male_light.jpg','/__l5e/assets-v1/acaf9504-6f15-48ff-a2fb-787a94eb0f1f/head_adult_male_light.jpg','BG Removify Studio',15),
  ('human-models','manual','/__l5e/assets-v1/9bf959c4-f740-4add-8430-c19364a7c649/wrist_female_realistic_light.jpg','/__l5e/assets-v1/9bf959c4-f740-4add-8430-c19364a7c649/wrist_female_realistic_light.jpg','BG Removify Studio',16),
  ('human-models','manual','/__l5e/assets-v1/d3cc9501-40f5-4a44-b188-de13a12868da/wrist_male_realistic_light.jpg','/__l5e/assets-v1/d3cc9501-40f5-4a44-b188-de13a12868da/wrist_male_realistic_light.jpg','BG Removify Studio',17);
