"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useCreateRecipe } from "@/hooks/use-recipes"
import {
  ChevronLeft,
  Link as LinkIcon,
  Camera,
  FileText,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"
import type { RecipeFormData } from "@/types/recipe"

type ImportMode = "url" | "photo" | null

export default function ImportRecipePage() {
  const router = useRouter()
  const [mode, setMode] = useState<ImportMode>(null)
  const [url, setUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedRecipe, setParsedRecipe] = useState<RecipeFormData | null>(null)

  const createRecipe = useCreateRecipe()

  const handleUrlImport = async () => {
    if (!url.trim()) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to import recipe")
      }

      const data = await response.json()
      setParsedRecipe(data.recipe)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoCapture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/recipes/import/ocr", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process image")
      }

      const data = await response.json()
      setParsedRecipe(data.recipe)
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveRecipe = async () => {
    if (!parsedRecipe) return

    try {
      const result = await createRecipe.mutateAsync(parsedRecipe)
      router.push(`/recipes/${result.recipe.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe")
    }
  }

  // Show parsed recipe preview
  if (parsedRecipe) {
    return (
      <div>
        <PageHeader
          title="Review Recipe"
          action={
            <Button variant="ghost" size="icon" onClick={() => setParsedRecipe(null)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          }
        />
        <div className="px-4 space-y-4 pb-24">
          <Card className="bg-secondary/10 border-secondary">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-secondary" />
              <p className="text-sm">
                AI extracted this recipe. Review and edit before saving.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-bold text-lg">{parsedRecipe.title}</h2>
              {parsedRecipe.description && (
                <p className="text-sm text-muted-foreground">
                  {parsedRecipe.description}
                </p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                {parsedRecipe.prepTime && <span>Prep: {parsedRecipe.prepTime}m</span>}
                {parsedRecipe.cookTime && <span>Cook: {parsedRecipe.cookTime}m</span>}
                <span>Serves: {parsedRecipe.servings}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">
                Ingredients ({parsedRecipe.ingredients.length})
              </h3>
              <ul className="space-y-1 text-sm">
                {parsedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-secondary" />
                    {ing.quantity} {ing.unit} {ing.name}
                    {ing.preparation && `, ${ing.preparation}`}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">
                Steps ({parsedRecipe.steps.length})
              </h3>
              <ol className="space-y-2 text-sm">
                {parsedRecipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium text-primary">{i + 1}.</span>
                    <span>{step.instruction}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // Navigate to edit form with pre-filled data
                router.push(`/recipes/new?import=${encodeURIComponent(JSON.stringify(parsedRecipe))}`)
              }}
            >
              Edit first
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveRecipe}
              disabled={createRecipe.isPending}
            >
              {createRecipe.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save recipe
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Import Recipe"
        action={
          <Link href="/recipes">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        }
      />

      <div className="px-4 space-y-4">
        {!mode && (
          <>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Choose how you want to import your recipe
            </p>

            <button
              onClick={() => setMode("url")}
              className="w-full"
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <LinkIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">From URL</h3>
                    <p className="text-sm text-muted-foreground">
                      Paste a link to a recipe website
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button
              onClick={() => setMode("photo")}
              className="w-full"
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">From Photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Take a photo of a cookbook or recipe card
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button
              onClick={() => router.push("/recipes/new")}
              className="w-full"
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">Enter manually</h3>
                    <p className="text-sm text-muted-foreground">
                      Type in your recipe by hand
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          </>
        )}

        {mode === "url" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto">
                  <LinkIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-center">Import from URL</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Paste a link to any recipe website. AI will extract the recipe
                  automatically.
                </p>

                <Input
                  type="url"
                  placeholder="https://example.com/recipe..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isProcessing}
                />

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button
                  className="w-full"
                  onClick={handleUrlImport}
                  disabled={!url.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Extracting recipe...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Import with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "photo" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-center">Scan Recipe</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Take a photo of a cookbook page, recipe card, or screenshot.
                  AI will read and extract the recipe.
                </p>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <div className="space-y-2">
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                      isProcessing
                        ? "bg-muted border-muted"
                        : "hover:bg-muted/50 border-muted-foreground/25"
                    )}
                  >
                    {isProcessing ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Processing image...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">
                          Take photo or choose file
                        </span>
                        <span className="text-xs text-muted-foreground">
                          JPG, PNG up to 10MB
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoCapture}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
