"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  X,
  ChevronLeft,
  ChevronRight,
  Timer,
  Check,
  Loader2,
  Pause,
  Play,
} from "lucide-react"
import { useRecipe } from "@/hooks/use-recipes"
import { cn } from "@/lib/utils/cn"

export default function CookModePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useRecipe(id)

  const recipe = data?.recipe
  const steps =
    recipe?.recipe_steps
      ?.slice()
      .sort((a, b) => a.step_number - b.step_number) ?? []

  const [currentStep, setCurrentStep] = useState(0)
  const [finished, setFinished] = useState(false)

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeStep = steps[currentStep] ?? null
  const totalSteps = steps.length

  // Reset timer when step changes
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimerRunning(false)

    if (activeStep?.duration_minutes) {
      setTimerSeconds(activeStep.duration_minutes * 60)
    } else {
      setTimerSeconds(null)
    }
  }, [currentStep, activeStep?.duration_minutes])

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds === null || timerSeconds <= 0) {
      return
    }

    intervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setTimerRunning(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timerRunning])

  const toggleTimer = useCallback(() => {
    if (timerSeconds === 0) return
    setTimerRunning((prev) => !prev)
  }, [timerSeconds])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setFinished(false)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      setFinished(true)
    }
  }, [currentStep, totalSteps])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const progress =
    totalSteps > 0
      ? ((currentStep + (finished ? 1 : 0)) / totalSteps) * 100
      : 0

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Recipe not found</p>
          <button
            onClick={() => router.back()}
            className="text-primary underline text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // No steps
  if (totalSteps === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            This recipe has no steps yet.
          </p>
          <button
            onClick={() => router.back()}
            className="text-primary underline text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // Finish state
  if (finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Progress bar - full */}
        <div className="w-full bg-muted h-1">
          <div className="bg-primary h-1 rounded-full w-full transition-all" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bon Appetit!</h1>
          <p className="text-muted-foreground mb-8">
            You finished cooking {recipe.title}
          </p>
          <a
            href={`/recipes/${id}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-12 px-8 text-sm font-medium hover:bg-primary/90 transition-colors w-full max-w-xs"
          >
            Back to recipe
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-muted h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium truncate">{recipe.title}</h1>
          <p className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="ml-3 p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Step number badge */}
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0 mb-6">
          {currentStep + 1}
        </div>

        {/* Instruction text */}
        <p className="text-lg leading-relaxed text-center max-w-lg">
          {activeStep?.instruction}
        </p>

        {/* Timer */}
        {timerSeconds !== null && (
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <span
                className={cn(
                  "text-2xl font-mono font-semibold tabular-nums",
                  timerSeconds === 0 ? "text-primary" : "text-foreground"
                )}
              >
                {formatTime(timerSeconds)}
              </span>
            </div>
            <button
              onClick={toggleTimer}
              disabled={timerSeconds === 0}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                timerSeconds === 0
                  ? "bg-muted text-muted-foreground"
                  : timerRunning
                    ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {timerRunning ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-6 pt-2 border-t">
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={cn(
              "flex-1 h-14 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              currentStep === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {currentStep === totalSteps - 1 ? (
              "Finish"
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
