"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import type { WeekPlanData, MealEntry, MealEntryInput } from "@/types/meal-plan"
import { useRealtimeSubscription } from "./use-realtime"

// Fetch meal plan for a week
async function fetchMealPlan(weekStart: string): Promise<WeekPlanData> {
  const response = await fetch(`/api/meal-plans?weekStart=${weekStart}`)

  if (!response.ok) {
    throw new Error("Failed to fetch meal plan")
  }

  return response.json()
}

// Add entry to meal plan
async function addMealEntry(data: MealEntryInput): Promise<{ entry: MealEntry }> {
  const response = await fetch("/api/meal-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to add meal")
  }

  return response.json()
}

// Delete entry
async function deleteMealEntry(entryId: string): Promise<void> {
  const response = await fetch(`/api/meal-plans/entries?entryId=${entryId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete meal")
  }
}

// Update entry
async function updateMealEntry({
  entryId,
  data,
}: {
  entryId: string
  data: Partial<MealEntryInput & { isCompleted?: boolean }>
}): Promise<{ entry: MealEntry }> {
  const response = await fetch(`/api/meal-plans/entries?entryId=${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to update meal")
  }

  return response.json()
}

// Hook to get meal plan for a specific week
export function useMealPlan(weekStart: Date) {
  const weekStartStr = format(weekStart, "yyyy-MM-dd")

  // Subscribe to realtime changes so other household members see updates
  useRealtimeSubscription({
    table: "meal_entries",
    queryKey: ["mealPlan", weekStartStr],
  })

  return useQuery({
    queryKey: ["mealPlan", weekStartStr],
    queryFn: () => fetchMealPlan(weekStartStr),
  })
}

// Hook to add a meal entry
export function useAddMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addMealEntry,
    onSuccess: () => {
      // Invalidate all meal plan queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] })
    },
  })
}

// Hook to delete a meal entry
export function useDeleteMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMealEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] })
    },
  })
}

// Hook to update a meal entry
export function useUpdateMealEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMealEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] })
    },
  })
}

// Hook to toggle meal completion
export function useToggleMealComplete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      isCompleted,
    }: {
      entryId: string
      isCompleted: boolean
    }) => {
      return updateMealEntry({ entryId, data: { isCompleted } })
    },
    onMutate: async ({ entryId, isCompleted }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["mealPlan"] })

      // Update the cache optimistically
      queryClient.setQueriesData<WeekPlanData>(
        { queryKey: ["mealPlan"] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            entries: old.entries.map((e) =>
              e.id === entryId ? { ...e, is_completed: isCompleted } : e
            ),
          }
        }
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] })
    },
  })
}
