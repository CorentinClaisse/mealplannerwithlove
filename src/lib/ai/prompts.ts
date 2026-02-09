export const RECIPE_OCR_PROMPT = `You are extracting a recipe from an image. The image may be:
- A photo of a cookbook page
- A handwritten recipe card
- A screenshot of a recipe
- A printed recipe

Extract all recipe information and structure it properly. Be thorough and accurate.

Respond with valid JSON in this exact format (no markdown, just JSON):
{
  "title": "Recipe name",
  "description": "Brief description if visible",
  "prepTime": number (minutes) or null,
  "cookTime": number (minutes) or null,
  "servings": number or null,
  "ingredients": [
    {
      "name": "ingredient name (e.g. 'chicken breast', 'olive oil')",
      "quantity": number or null,
      "unit": "unit (e.g. 'cups', 'tbsp', 'lbs')" or null,
      "preparation": "diced, minced, etc." or null,
      "notes": "any notes" or null,
      "originalText": "exact text from image"
    }
  ],
  "steps": [
    {
      "instruction": "Step instruction text",
      "duration": number (minutes) or null
    }
  ],
  "cuisine": "cuisine type if identifiable" or null,
  "mealType": ["breakfast", "lunch", "dinner", or "snack"] (array of applicable types),
  "tags": ["relevant", "tags"],
  "confidence": 0.0-1.0,
  "notes": "Any issues or unclear parts"
}

Important guidelines:
- Preserve the original ingredient text in "originalText"
- Parse quantities carefully (handle fractions like 1/2, 3/4 - convert to decimals)
- Identify preparation methods (diced, minced, sliced, etc.)
- Number steps in order
- If text is partially illegible, make reasonable inferences and note lower confidence
- Include all visible information even if formatting is imperfect
- Return ONLY the JSON object, no other text`

export const URL_EXTRACT_PROMPT = `You are extracting recipe information from webpage content. The content has been scraped from a recipe website.

Parse the content and extract the recipe in a structured format. Look for:
- Recipe title
- Description or intro text
- Prep time, cook time, total time
- Servings/yield
- Ingredients list with quantities and units
- Step-by-step instructions
- Any tips or notes
- Cuisine type and categories

Many recipe sites use structured data (JSON-LD) or common HTML patterns. Extract information from wherever it appears.

Respond with valid JSON (no markdown, just JSON):
{
  "title": "Recipe name",
  "description": "Description",
  "prepTime": number (minutes) or null,
  "cookTime": number (minutes) or null,
  "servings": number or null,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": number or null,
      "unit": "unit" or null,
      "preparation": "prep method" or null,
      "originalText": "original ingredient line"
    }
  ],
  "steps": [
    {
      "instruction": "instruction text",
      "duration": number or null
    }
  ],
  "cuisine": "cuisine" or null,
  "mealType": ["breakfast", "lunch", "dinner", or "snack"],
  "tags": ["tags"],
  "author": "recipe author if available" or null,
  "notes": "any tips or notes from the original",
  "confidence": 0.0-1.0
}

Be careful to:
- Distinguish between ingredient notes and actual ingredients
- Parse quantity fractions correctly (convert 1/2 to 0.5, etc.)
- Keep step instructions clear and actionable
- Preserve useful tips and variations
- Return ONLY the JSON object, no other text`

export const FRIDGE_SCAN_PROMPT = `You are analyzing an image of the inside of a refrigerator, freezer, or pantry to identify food items.

Analyze the image and identify all visible food items. For each item, provide:
- name: The common name of the ingredient
- quantity: Estimated quantity (number or description like "half", "nearly empty")
- unit: The unit (items, lb, oz, bunch, bag, bottle, container, etc.)
- confidence: Your confidence level from 0.0 to 1.0

Focus on ingredients that could be used in cooking. Include:
- Fresh produce (fruits, vegetables)
- Proteins (meat, fish, eggs, tofu)
- Dairy products
- Condiments and sauces
- Beverages
- Packaged goods

Be specific where possible (e.g., "red bell pepper" not just "pepper").

Respond with valid JSON (no markdown, just JSON):
{
  "items": [
    {
      "name": "string",
      "quantity": number or null,
      "unit": "string or null",
      "confidence": number
    }
  ],
  "notes": "Any relevant observations about freshness or storage"
}

If you cannot identify items clearly or the image is unclear, still provide your best guesses with lower confidence scores.
Return ONLY the JSON object, no other text`

export function RECIPE_SUGGESTION_PROMPT(
  inventory: Array<{ name: string; quantity?: number; unit?: string; location: string }>,
  userRecipes: Array<{ title: string; meal_type: string[]; tags: string[] }>
) {
  return `You are a helpful meal planning assistant. Based on the user's available ingredients, suggest recipes they can make.

AVAILABLE INGREDIENTS:
${inventory.map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity} ${i.unit || ""})` : ""} [${i.location}]`).join("\n")}

USER'S EXISTING RECIPES (for context on their preferences):
${userRecipes
  .slice(0, 20)
  .map((r) => `- ${r.title} (${r.meal_type.join(", ")})`)
  .join("\n")}

Suggest 5 recipes that:
1. Primarily use ingredients they already have
2. Are practical for home cooking
3. Vary in meal type (breakfast, lunch, dinner)
4. Match their apparent cooking style/preferences

Respond with valid JSON (no markdown, just JSON):
{
  "suggestions": [
    {
      "title": "Recipe name",
      "description": "Brief appetizing description",
      "usesIngredients": ["ingredient1", "ingredient2"],
      "additionalNeeded": ["ingredient1"],
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "prepTime": number,
      "cookTime": number,
      "difficulty": "easy" | "medium" | "hard",
      "matchScore": 0.0-1.0 (how well it matches their ingredients)
    }
  ]
}
Return ONLY the JSON object, no other text`
}
