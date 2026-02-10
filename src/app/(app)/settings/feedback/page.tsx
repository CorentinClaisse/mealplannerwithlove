"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

const ratings = [
  { emoji: "\uD83D\uDE0D", label: "Love it" },
  { emoji: "\uD83D\uDE42", label: "Like it" },
  { emoji: "\uD83D\uDE10", label: "Neutral" },
  { emoji: "\uD83D\uDE41", label: "Dislike" },
  { emoji: "\uD83D\uDE21", label: "Hate it" },
]

export default function FeedbackPage() {
  const router = useRouter()
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    console.log("Feedback submitted:", {
      rating: selectedRating !== null ? ratings[selectedRating].label : null,
      text: feedbackText,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div>
        <PageHeader
          title="Feedback"
          action={
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          }
        />

        <div className="px-4 pb-24">
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              Thank you for your feedback!
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Your input helps us improve Meal Prep for everyone.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Feedback"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* Rating */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            How are you enjoying Meal Prep?
          </h3>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                {ratings.map((rating, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedRating(index)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                      selectedRating === index
                        ? "ring-2 ring-primary bg-primary/5 scale-110"
                        : "hover:bg-muted"
                    )}
                  >
                    {rating.emoji}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Text feedback */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Tell us more
          </h3>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What can we improve? What do you love?"
            className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px] resize-none"
          />
        </div>

        {/* Submit */}
        <Button className="w-full" onClick={handleSubmit}>
          Send Feedback
        </Button>
      </div>
    </div>
  )
}
