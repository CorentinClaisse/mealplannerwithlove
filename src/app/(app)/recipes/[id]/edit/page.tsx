"use client"

import { use } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { Button } from "@/components/ui/button"
import { useRecipe } from "@/hooks/use-recipes"
import { ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = useRecipe(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data?.recipe) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Recipe not found</p>
        <Link href="/recipes">
          <Button variant="link">Back to recipes</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Edit Recipe"
        action={
          <Link href={`/recipes/${id}`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        }
      />
      <div className="px-4">
        <RecipeForm recipe={data.recipe} mode="edit" />
      </div>
    </div>
  )
}
