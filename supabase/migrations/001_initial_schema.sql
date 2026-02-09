-- =============================================
-- MEAL PREP PWA - DATABASE SCHEMA
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Households table (enables partner sharing)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household invitations for partner sharing
CREATE TABLE household_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- RECIPE TABLES
-- =============================================

-- Ingredients table (normalized for aggregation)
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT,
  default_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(normalized_name)
);

CREATE INDEX ingredients_normalized_idx ON ingredients(normalized_name);
CREATE INDEX ingredients_category_idx ON ingredients(category);

-- Main recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Timing and servings
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 2,

  -- Categorization
  cuisine TEXT,
  meal_type TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Source tracking (for URL import / OCR)
  source_type TEXT CHECK (source_type IN ('manual', 'url_import', 'ocr', 'ai_generated')),
  source_url TEXT,

  -- Metadata
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  times_cooked INTEGER NOT NULL DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipes_household_idx ON recipes(household_id);
CREATE INDEX recipes_meal_type_idx ON recipes USING GIN(meal_type);
CREATE INDEX recipes_tags_idx ON recipes USING GIN(tags);

-- Recipe ingredients (junction with quantity)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,

  quantity DECIMAL(10, 3),
  unit TEXT,
  preparation TEXT,
  notes TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  original_text TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipe_ingredients_recipe_idx ON recipe_ingredients(recipe_id);
CREATE INDEX recipe_ingredients_ingredient_idx ON recipe_ingredients(ingredient_id);

-- Recipe steps/instructions
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  duration_minutes INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(recipe_id, step_number)
);

CREATE INDEX recipe_steps_recipe_idx ON recipe_steps(recipe_id);

-- =============================================
-- MEAL PLANNING TABLES
-- =============================================

-- Meal plans (weekly planning)
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(household_id, week_start)
);

CREATE INDEX meal_plans_household_week_idx ON meal_plans(household_id, week_start);

-- Individual meal entries
CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  custom_meal_name TEXT,
  servings_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT meal_entry_has_content CHECK (
    recipe_id IS NOT NULL OR custom_meal_name IS NOT NULL
  )
);

CREATE INDEX meal_entries_plan_idx ON meal_entries(meal_plan_id);
CREATE INDEX meal_entries_date_idx ON meal_entries(date);
CREATE INDEX meal_entries_recipe_idx ON meal_entries(recipe_id);

-- =============================================
-- SHOPPING TABLES
-- =============================================

-- Shopping lists
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,

  name TEXT NOT NULL DEFAULT 'Shopping List',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shopping_lists_household_idx ON shopping_lists(household_id);
CREATE INDEX shopping_lists_status_idx ON shopping_lists(status);

-- Shopping list items
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  quantity DECIMAL(10, 3),
  unit TEXT,
  category TEXT,
  aisle TEXT,

  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id),

  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  source_recipe_ids UUID[] DEFAULT '{}',

  adjusted_quantity DECIMAL(10, 3),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shopping_items_list_idx ON shopping_list_items(shopping_list_id);
CREATE INDEX shopping_items_checked_idx ON shopping_list_items(is_checked);
CREATE INDEX shopping_items_category_idx ON shopping_list_items(category);

-- =============================================
-- INVENTORY TABLES
-- =============================================

-- Inventory items (what user has on hand)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  quantity DECIMAL(10, 3),
  unit TEXT,

  location TEXT DEFAULT 'fridge' CHECK (location IN ('fridge', 'freezer', 'pantry')),
  expiry_date DATE,

  source TEXT CHECK (source IN ('manual', 'ai_scan', 'shopping_list')),
  confidence_score DECIMAL(3, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inventory_household_idx ON inventory_items(household_id);
CREATE INDEX inventory_ingredient_idx ON inventory_items(ingredient_id);
CREATE INDEX inventory_expiry_idx ON inventory_items(expiry_date);

-- Fridge scan history
CREATE TABLE fridge_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES profiles(id),

  image_url TEXT NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'fridge' CHECK (scan_type IN ('fridge', 'freezer', 'pantry', 'receipt')),

  raw_ai_response JSONB,
  items_detected INTEGER,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX fridge_scans_household_idx ON fridge_scans(household_id);

-- =============================================
-- IMPORT HISTORY
-- =============================================

-- Recipe import attempts (URL and OCR)
CREATE TABLE recipe_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  imported_by UUID REFERENCES profiles(id),

  import_type TEXT NOT NULL CHECK (import_type IN ('url', 'ocr', 'photo')),
  source_url TEXT,
  image_url TEXT,

  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_needed')),

  raw_ai_response JSONB,
  confidence_score DECIMAL(3, 2),
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX recipe_imports_household_idx ON recipe_imports(household_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_imports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user's household ID
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Households: members can view their household
CREATE POLICY "Users can view own household"
  ON households FOR SELECT
  USING (id = get_user_household_id());

CREATE POLICY "Users can update own household"
  ON households FOR UPDATE
  USING (id = get_user_household_id());

-- Ingredients: publicly readable (shared across all users)
CREATE POLICY "Anyone can read ingredients"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ingredients"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recipes: household-scoped
CREATE POLICY "Household members can view recipes"
  ON recipes FOR SELECT
  USING (household_id = get_user_household_id());

CREATE POLICY "Household members can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Household members can update recipes"
  ON recipes FOR UPDATE
  USING (household_id = get_user_household_id());

CREATE POLICY "Household members can delete recipes"
  ON recipes FOR DELETE
  USING (household_id = get_user_household_id());

-- Recipe ingredients: access through recipe
CREATE POLICY "Access recipe ingredients through recipe"
  ON recipe_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.household_id = get_user_household_id()
    )
  );

-- Recipe steps: access through recipe
CREATE POLICY "Access recipe steps through recipe"
  ON recipe_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_steps.recipe_id
      AND recipes.household_id = get_user_household_id()
    )
  );

-- Meal plans: household-scoped
CREATE POLICY "Household members can manage meal plans"
  ON meal_plans FOR ALL
  USING (household_id = get_user_household_id());

-- Meal entries: access through meal plan
CREATE POLICY "Access meal entries through meal plan"
  ON meal_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_entries.meal_plan_id
      AND meal_plans.household_id = get_user_household_id()
    )
  );

-- Shopping lists: household-scoped
CREATE POLICY "Household members can manage shopping lists"
  ON shopping_lists FOR ALL
  USING (household_id = get_user_household_id());

-- Shopping list items: access through shopping list
CREATE POLICY "Access shopping items through shopping list"
  ON shopping_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.household_id = get_user_household_id()
    )
  );

-- Inventory: household-scoped
CREATE POLICY "Household members can manage inventory"
  ON inventory_items FOR ALL
  USING (household_id = get_user_household_id());

-- Fridge scans: household-scoped
CREATE POLICY "Household members can manage fridge scans"
  ON fridge_scans FOR ALL
  USING (household_id = get_user_household_id());

-- Recipe imports: household-scoped
CREATE POLICY "Household members can manage recipe imports"
  ON recipe_imports FOR ALL
  USING (household_id = get_user_household_id());

-- Household invitations: viewable by household members or invitee
CREATE POLICY "View household invitations"
  ON household_invitations FOR SELECT
  USING (
    household_id = get_user_household_id()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Household owners can create invitations"
  ON household_invitations FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meal_entries_updated_at
  BEFORE UPDATE ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create household for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create a new household for the user
  INSERT INTO households (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', 'My Household'))
  RETURNING id INTO new_household_id;

  -- Create profile linked to household
  INSERT INTO profiles (id, household_id, display_name, role)
  VALUES (
    NEW.id,
    new_household_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Generate shopping list from meal plan
CREATE OR REPLACE FUNCTION generate_shopping_list(p_meal_plan_id UUID)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
  v_shopping_list_id UUID;
BEGIN
  -- Get household from meal plan
  SELECT household_id INTO v_household_id
  FROM meal_plans WHERE id = p_meal_plan_id;

  -- Create new shopping list
  INSERT INTO shopping_lists (household_id, meal_plan_id, name)
  VALUES (v_household_id, p_meal_plan_id, 'Shopping List - ' || TO_CHAR(NOW(), 'Mon DD'))
  RETURNING id INTO v_shopping_list_id;

  -- Aggregate ingredients from all meal entries
  INSERT INTO shopping_list_items (
    shopping_list_id, ingredient_id, name, quantity, unit, category, source_recipe_ids
  )
  SELECT
    v_shopping_list_id,
    ri.ingredient_id,
    i.name,
    SUM(ri.quantity * me.servings_multiplier),
    ri.unit,
    i.category,
    ARRAY_AGG(DISTINCT me.recipe_id) FILTER (WHERE me.recipe_id IS NOT NULL)
  FROM meal_entries me
  JOIN recipe_ingredients ri ON ri.recipe_id = me.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE me.meal_plan_id = p_meal_plan_id
    AND me.recipe_id IS NOT NULL
  GROUP BY ri.ingredient_id, i.name, ri.unit, i.category;

  RETURN v_shopping_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
