"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useCollections } from "@/hooks/use-collections"
import { useRecipes } from "@/hooks/use-recipes"
import { ChevronLeft, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { collections } = useCollections()
  const { data, isLoading } = useRecipes({})

  const collection = collections.find((c) => c.id === id)
  const allRecipes = data?.recipes || []
  const recipes = allRecipes.filter((r) =>
    collection?.recipeIds.includes(r.id)
  )

  if (!collection) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Collection not found</p>
        <Link href="/recipes/collections">
          <Button variant="link">Back to collections</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <PageHeader
        title={`${collection.emoji} ${collection.name}`}
        subtitle={`${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/recipes/collections">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        }
      />

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && recipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">{collection.emoji}</p>
            <p className="font-semibold text-foreground">No recipes yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add recipes from the recipe detail page
            </p>
            <Link href="/recipes">
              <Button size="sm" className="mt-4">
                Browse recipes
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && recipes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe) => {
              const totalTime =
                (recipe.prep_time_minutes || 0) +
                (recipe.cook_time_minutes || 0)

              return (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                  <div className="bg-card rounded-2xl overflow-hidden border border-border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in">
                    <div className="aspect-[4/3] bg-primary/10 flex items-center justify-center">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🍽️</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-foreground truncate">
                        {recipe.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          {totalTime || "?"} min
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
