"use client"

import { useState } from "react"
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns"
import { Plus, ChevronLeft, ChevronRight, Loader2, UtensilsCrossed, Clock } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { AddMealModal } from "@/components/planner/add-meal-modal"
import { MealCard } from "@/components/planner/meal-card"
import { useMealPlan } from "@/hooks/use-meal-plan"
import type { MealType, MealEntry } from "@/types/meal-plan"
import { cn } from "@/lib/utils/cn"

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"]

const slotLabels: Record<MealType, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍿 Snack",
}

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [addMealModal, setAddMealModal] = useState<{
    open: boolean
    date: Date
    mealType: MealType
  }>({
    open: false,
    date: new Date(),
    mealType: "dinner",
  })

  const { data, isLoading, error } = useMealPlan(currentWeekStart)

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  )

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
    )
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const openAddMealModal = (date: Date, mealType: MealType) => {
    setAddMealModal({
      open: true,
      date,
      mealType,
    })
  }

  const getEntriesForSlot = (date: Date, mealType: MealType): MealEntry[] => {
    if (!data?.entries) return []

    const dateStr = format(date, "yyyy-MM-dd")
    return data.entries.filter(
      (entry) => entry.date === dateStr && entry.meal_type === mealType
    )
  }

  const weekRange = `${format(currentWeekStart, "MMM d")} – ${format(
    addDays(currentWeekStart, 6),
    "MMM d, yyyy"
  )}`

  return (
    <div className="pb-20">
      <PageHeader
        title="Meal Planner"
        subtitle={weekRange}
      />

      {/* Week Navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => navigateWeek("prev")}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={goToToday}
          className="px-4 py-1.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground"
        >
          Today
        </button>
        <button
          onClick={() => navigateWeek("next")}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Tonight's Dinner Card */}
      {!isLoading && !error && (() => {
        const todayStr = format(new Date(), "yyyy-MM-dd")
        const todayDinner = data?.entries?.filter(
          (e) => e.date === todayStr && e.meal_type === "dinner"
        ) || []
        const todayLunch = data?.entries?.filter(
          (e) => e.date === todayStr && e.meal_type === "lunch"
        ) || []
        // Show the next upcoming meal: dinner first, or lunch if no dinner
        const nextMeal = todayDinner.length > 0 ? todayDinner : todayLunch
        const mealLabel = todayDinner.length > 0 ? "Tonight's Dinner" : "Today's Lunch"
        const entry = nextMeal[0]

        if (!entry) return null

        const recipe = entry.recipe
        const totalTime = recipe
          ? (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)
          : 0

        return (
          <div className="px-4 mb-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <div className="flex items-center gap-4 p-4">
                {recipe?.image_url ? (
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">{mealLabel}</p>
                  <p className="font-bold text-foreground truncate">
                    {recipe?.title || entry.custom_meal_name || "Meal"}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {totalTime > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {totalTime} min
                      </span>
                    )}
                    {nextMeal.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                        +{nextMeal.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
                {recipe && (
                  <Link href={`/recipes/${recipe.id}`}>
                    <button className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                      View
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-4 py-8 text-center">
          <p className="text-4xl mb-2">😕</p>
          <p className="font-semibold text-foreground">Failed to load meal plan</p>
          <button
            className="mt-2 text-sm text-primary hover:underline"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {/* Week View - Horizontal Scroll */}
      {!isLoading && !error && (
        <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
          {weekDays.map((date) => (
            <DayColumn
              key={date.toISOString()}
              date={date}
              getEntriesForSlot={getEntriesForSlot}
              onAddMeal={openAddMealModal}
            />
          ))}
        </div>
      )}

      {/* Add Meal Modal */}
      <AddMealModal
        open={addMealModal.open}
        onOpenChange={(open) => setAddMealModal((prev) => ({ ...prev, open }))}
        date={addMealModal.date}
        mealType={addMealModal.mealType}
      />
    </div>
  )
}

interface DayColumnProps {
  date: Date
  getEntriesForSlot: (date: Date, mealType: MealType) => MealEntry[]
  onAddMeal: (date: Date, mealType: MealType) => void
}

function DayColumn({ date, getEntriesForSlot, onAddMeal }: DayColumnProps) {
  const dayIsToday = isToday(date)

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[280px] snap-start rounded-2xl p-3 border transition-all duration-200",
        dayIsToday ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className={cn(
        "text-center mb-3 pb-2 border-b",
        dayIsToday ? "border-primary/20" : "border-border"
      )}>
        <p className={cn(
          "text-xs font-bold uppercase tracking-wider",
          dayIsToday ? "text-primary" : "text-muted-foreground"
        )}>
          {format(date, "EEE")}
        </p>
        <p className={cn(
          "text-lg font-serif",
          dayIsToday ? "text-primary" : "text-foreground"
        )}>
          {format(date, "MMM d")}
        </p>
      </div>

      <div className="space-y-2">
        {MEAL_TYPES.map((mealType) => (
          <MealSlot
            key={mealType}
            mealType={mealType}
            entries={getEntriesForSlot(date, mealType)}
            onAddMeal={() => onAddMeal(date, mealType)}
          />
        ))}
      </div>
    </div>
  )
}

interface MealSlotProps {
  mealType: MealType
  entries: MealEntry[]
  onAddMeal: () => void
}

function MealSlot({ mealType, entries, onAddMeal }: MealSlotProps) {
  const hasEntries = entries.length > 0

  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground mb-1">
        {slotLabels[mealType]}
      </p>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <MealCard key={entry.id} entry={entry} />
        ))}

        {!hasEntries && (
          <button
            onClick={onAddMeal}
            className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-semibold">Add meal</span>
          </button>
        )}

        {hasEntries && (
          <button
            onClick={onAddMeal}
            className="w-full py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1 text-muted-foreground text-xs"
          >
            <Plus className="w-3 h-3" />
            Add more
          </button>
        )}
      </div>
    </div>
  )
}
