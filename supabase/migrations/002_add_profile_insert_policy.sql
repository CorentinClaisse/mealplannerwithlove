-- Allow users to insert their own profile row
-- Needed for edge cases where the trigger doesn't fire
-- (e.g., invitation acceptance flow)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
