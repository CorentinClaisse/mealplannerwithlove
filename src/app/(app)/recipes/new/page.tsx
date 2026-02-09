"use client"

import { PageHeader } from "@/components/layout/page-header"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function NewRecipePage() {
  return (
    <div>
      <PageHeader
        title="New Recipe"
        action={
          <Link href="/recipes">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        }
      />
      <div className="px-4">
        <RecipeForm mode="create" />
      </div>
    </div>
  )
}
