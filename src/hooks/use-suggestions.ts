"use client"

import { useQuery } from "@tanstack/react-query"
import type { SuggestionsResponse } from "@/types/suggestions"

async function fetchSuggestions(): Promise<SuggestionsResponse> {
  const response = await fetch("/api/suggestions")

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch suggestions")
  }

  return response.json()
}

export function useSuggestions(enabled = true) {
  return useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestions,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions don't need to refresh often
    retry: 1,
  })
}
