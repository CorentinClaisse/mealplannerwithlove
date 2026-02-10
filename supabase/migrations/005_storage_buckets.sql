-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('recipe-images', 'recipe-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('scan-images', 'scan-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- RLS for recipe-images: authenticated users can upload and read
CREATE POLICY "Authenticated users can upload recipe images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Anyone can view recipe images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'recipe-images');

-- RLS for avatars: users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- RLS for scan-images: authenticated users only
CREATE POLICY "Authenticated users can upload scan images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'scan-images');

CREATE POLICY "Authenticated users can view scan images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'scan-images');
