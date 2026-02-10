-- Check if an email address belongs to a user who is already a member of a given household
CREATE OR REPLACE FUNCTION is_email_household_member(p_household_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.household_id = p_household_id
      AND LOWER(u.email) = LOWER(p_email)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
