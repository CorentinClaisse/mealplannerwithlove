-- Enhanced shopping list generation with optional inventory deduction
CREATE OR REPLACE FUNCTION generate_shopping_list(
  p_meal_plan_id UUID,
  p_deduct_inventory BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
  v_shopping_list_id UUID;
BEGIN
  -- Get household from meal plan
  SELECT household_id INTO v_household_id
  FROM meal_plans WHERE id = p_meal_plan_id;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Meal plan not found';
  END IF;

  -- Get or create active shopping list
  SELECT id INTO v_shopping_list_id
  FROM shopping_lists
  WHERE household_id = v_household_id AND status = 'active'
  LIMIT 1;

  IF v_shopping_list_id IS NULL THEN
    INSERT INTO shopping_lists (household_id, meal_plan_id, name, status)
    VALUES (
      v_household_id,
      p_meal_plan_id,
      'Shopping List - ' || TO_CHAR(NOW(), 'Mon DD'),
      'active'
    )
    RETURNING id INTO v_shopping_list_id;
  END IF;

  -- Aggregate ingredients from meal entries, optionally deducting inventory
  INSERT INTO shopping_list_items (
    shopping_list_id, ingredient_id, name, quantity, unit, category,
    source_recipe_ids, is_manual, is_checked
  )
  SELECT
    v_shopping_list_id,
    agg.ingredient_id,
    agg.name,
    CASE
      WHEN p_deduct_inventory THEN
        GREATEST(0, agg.total_quantity - COALESCE(inv.total_on_hand, 0))
      ELSE
        agg.total_quantity
    END,
    agg.unit,
    agg.category,
    agg.recipe_ids,
    FALSE,
    FALSE
  FROM (
    SELECT
      ri.ingredient_id,
      i.name,
      SUM(ri.quantity * me.servings_multiplier) AS total_quantity,
      ri.unit,
      i.category,
      ARRAY_AGG(DISTINCT me.recipe_id) FILTER (WHERE me.recipe_id IS NOT NULL) AS recipe_ids
    FROM meal_entries me
    JOIN recipe_ingredients ri ON ri.recipe_id = me.recipe_id
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE me.meal_plan_id = p_meal_plan_id
      AND me.recipe_id IS NOT NULL
    GROUP BY ri.ingredient_id, i.name, ri.unit, i.category
  ) agg
  LEFT JOIN (
    SELECT
      LOWER(name) AS norm_name,
      unit,
      SUM(COALESCE(quantity, 0)) AS total_on_hand
    FROM inventory_items
    WHERE household_id = v_household_id
    GROUP BY LOWER(name), unit
  ) inv ON LOWER(agg.name) = inv.norm_name AND agg.unit = inv.unit
  WHERE (
    CASE
      WHEN p_deduct_inventory THEN
        GREATEST(0, agg.total_quantity - COALESCE(inv.total_on_hand, 0)) > 0
      ELSE TRUE
    END
  );

  RETURN v_shopping_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
