"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

const faqs = [
  {
    question: "How do I add a recipe?",
    answer:
      "You can add recipes manually, import from a URL, or scan a cookbook photo using our AI-powered OCR.",
  },
  {
    question: "How does the meal planner work?",
    answer:
      "Navigate to the Planner tab, tap any empty slot to add a meal. You can add recipes from your collection or enter custom meals.",
  },
  {
    question: "How do I share with my partner?",
    answer:
      "Go to Settings > Household and invite them via email. Once they accept, you'll share recipes, meal plans, and shopping lists in real-time.",
  },
  {
    question: "How does the AI fridge scanner work?",
    answer:
      "Go to Inventory, tap 'Scan with AI', and take a photo of your fridge contents. Our AI will identify the items and add them to your inventory.",
  },
  {
    question: "Can I use the app offline?",
    answer:
      "Offline support is coming soon! Currently, you need an internet connection to sync your data.",
  },
]

export default function HelpCenterPage() {
  const router = useRouter()
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({})

  const toggleItem = (index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  return (
    <div>
      <PageHeader
        title="Help Center"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* FAQ */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-border">
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground pr-2">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                        openItems[index] && "rotate-180"
                      )}
                    />
                  </button>
                  {openItems[index] && (
                    <div className="px-3 pb-3 -mt-1">
                      <p className="text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
