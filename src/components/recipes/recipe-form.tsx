"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCreateRecipe, useUpdateRecipe } from "@/hooks/use-recipes"
import type { Recipe, RecipeFormData } from "@/types/recipe"
import {
  Plus,
  Trash2,
  Clock,
  Users,
  Loader2,
  GripVertical,
  X,
  Sparkles,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"

const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name required"),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  preparation: z.string().optional(),
  notes: z.string().optional(),
  isOptional: z.boolean().optional(),
})

const stepSchema = z.object({
  instruction: z.string().min(1, "Instruction required"),
  duration: z.number().optional(),
})

const recipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  prepTime: z.number().min(0).optional(),
  cookTime: z.number().min(0).optional(),
  servings: z.number().min(1),
  cuisine: z.string().optional(),
  mealType: z.array(z.string()),
  tags: z.array(z.string()),
  ingredients: z.array(ingredientSchema).min(1, "Add at least one ingredient"),
  steps: z.array(stepSchema).min(1, "Add at least one step"),
})

type FormValues = {
  title: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings: number
  cuisine?: string
  mealType: string[]
  tags: string[]
  ingredients: Array<{
    name: string
    quantity?: number
    unit?: string
    preparation?: string
    notes?: string
    isOptional?: boolean
  }>
  steps: Array<{
    instruction: string
    duration?: number
  }>
}

const mealTypeOptions = ["breakfast", "lunch", "dinner", "snack"]

interface RecipeFormProps {
  recipe?: Recipe
  mode?: "create" | "edit"
}

export function RecipeForm({ recipe, mode = "create" }: RecipeFormProps) {
  const router = useRouter()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const [tagInput, setTagInput] = useState("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(recipe?.image_url || null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const isLoading = createRecipe.isPending || updateRecipe.isPending

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: recipe
      ? {
          title: recipe.title,
          description: recipe.description || "",
          prepTime: recipe.prep_time_minutes || undefined,
          cookTime: recipe.cook_time_minutes || undefined,
          servings: recipe.servings,
          cuisine: recipe.cuisine || "",
          mealType: recipe.meal_type || [],
          tags: recipe.tags || [],
          ingredients:
            recipe.recipe_ingredients?.map((ri) => ({
              name: ri.ingredient?.name || "",
              quantity: ri.quantity || undefined,
              unit: ri.unit || "",
              preparation: ri.preparation || "",
              notes: ri.notes || "",
              isOptional: ri.is_optional,
            })) || [],
          steps:
            recipe.recipe_steps?.map((s) => ({
              instruction: s.instruction,
              duration: s.duration_minutes || undefined,
            })) || [],
        }
      : {
          title: "",
          servings: 2,
          mealType: [],
          tags: [],
          ingredients: [{ name: "", quantity: undefined, unit: "" }],
          steps: [{ instruction: "" }],
        },
  })

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control,
    name: "ingredients",
  })

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control,
    name: "steps",
  })

  const mealType = watch("mealType")
  const tags = watch("tags")

  const toggleMealType = (type: string) => {
    const current = mealType || []
    if (current.includes(type)) {
      setValue(
        "mealType",
        current.filter((t) => t !== type)
      )
    } else {
      setValue("mealType", [...current, type])
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setValue("tags", [...tags, tag])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag)
    )
  }

  const generateAIImage = async () => {
    const title = watch("title")
    const description = watch("description")
    const ingredients = watch("ingredients")

    if (!title) {
      alert("Please enter a recipe title first")
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await fetch("/api/recipes/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe?.id,
          title,
          description,
          ingredients: ingredients.map((i) => i.name).filter(Boolean),
        }),
      })

      const data = await response.json()
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl)
      } else {
        alert("Failed to generate image: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Failed to generate image:", error)
      alert("Failed to generate image")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const onSubmit = async (data: FormValues) => {
    const formData: RecipeFormData = {
      ...data,
      imageUrl: generatedImage || undefined,
      ingredients: data.ingredients.map((ing) => ({
        ...ing,
        quantity: ing.quantity || undefined,
      })),
      steps: data.steps.map((step) => ({
        ...step,
        duration: step.duration || undefined,
      })),
    }

    try {
      if (mode === "edit" && recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, data: formData })
        router.push(`/recipes/${recipe.id}`)
      } else {
        const result = await createRecipe.mutateAsync(formData)
        router.push(`/recipes/${result.recipe.id}`)
      }
    } catch (error) {
      console.error("Failed to save recipe:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-8">
      {/* AI Image Generation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-4">
            {generatedImage ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                <img
                  src={generatedImage}
                  alt="Recipe"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3 gap-2"
                  onClick={generateAIImage}
                  disabled={isGeneratingImage}
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Regenerate
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={generateAIImage}
                disabled={isGeneratingImage}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="text-sm font-medium">Generating image...</span>
                    <span className="text-xs">This may take a few seconds</span>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium">Generate AI Image</span>
                    <span className="text-xs">Create a beautiful photo of your recipe</span>
                  </>
                )}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Input
              placeholder="Recipe title"
              {...register("title")}
              className={cn(
                "text-lg font-semibold",
                errors.title && "border-destructive"
              )}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <Textarea
            placeholder="Description (optional)"
            {...register("description")}
            rows={2}
          />

          {/* Time and Servings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" /> Prep
              </label>
              <Input
                type="number"
                placeholder="min"
                {...register("prepTime", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" /> Cook
              </label>
              <Input
                type="number"
                placeholder="min"
                {...register("cookTime", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" /> Servings
              </label>
              <Input
                type="number"
                {...register("servings", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Meal type
            </label>
            <div className="flex flex-wrap gap-2">
              {mealTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleMealType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm capitalize transition-colors",
                    mealType.includes(type)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <div>
        <h3 className="font-semibold mb-3">Ingredients</h3>
        {errors.ingredients && (
          <p className="text-xs text-destructive mb-2">
            {errors.ingredients.message}
          </p>
        )}
        <div className="space-y-2">
          {ingredientFields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-2.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ingredient"
                        {...register(`ingredients.${index}.name`)}
                        className={cn(
                          "flex-1",
                          errors.ingredients?.[index]?.name && "border-destructive"
                        )}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        {...register(`ingredients.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="w-20"
                      />
                      <Input
                        placeholder="Unit"
                        {...register(`ingredients.${index}.unit`)}
                        className="w-20"
                      />
                    </div>
                    <Input
                      placeholder="Preparation (e.g., diced, minced)"
                      {...register(`ingredients.${index}.preparation`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredientFields.length === 1}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2"
          onClick={() =>
            appendIngredient({ name: "", quantity: undefined, unit: "" })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add ingredient
        </Button>
      </div>

      {/* Steps */}
      <div>
        <h3 className="font-semibold mb-3">Instructions</h3>
        {errors.steps && (
          <p className="text-xs text-destructive mb-2">{errors.steps.message}</p>
        )}
        <div className="space-y-2">
          {stepFields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Step ${index + 1}`}
                      {...register(`steps.${index}.instruction`)}
                      className={cn(
                        errors.steps?.[index]?.instruction && "border-destructive"
                      )}
                      rows={2}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Duration (min)"
                        {...register(`steps.${index}.duration`, {
                          valueAsNumber: true,
                        })}
                        className="w-32"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    disabled={stepFields.length === 1}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2"
          onClick={() => appendStep({ instruction: "" })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add step
        </Button>
      </div>

      {/* Submit */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : mode === "edit" ? (
            "Save changes"
          ) : (
            "Create recipe"
          )}
        </Button>
      </div>
    </form>
  )
}
