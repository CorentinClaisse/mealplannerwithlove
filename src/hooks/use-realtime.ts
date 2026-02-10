"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface RealtimeSubscriptionOptions {
  /** The database table to subscribe to */
  table: string
  /** The React Query key(s) to invalidate when changes are detected */
  queryKey: string[]
  /** Optional PostgREST filter, e.g., "shopping_list_id=eq.abc-123" */
  filter?: string
  /** Which events to listen for (default: all) */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
}

/**
 * Subscribe to Supabase Realtime changes on a table and
 * automatically invalidate the related React Query cache.
 *
 * NOTE: Requires Realtime to be enabled for the table in
 * your Supabase dashboard (Database > Replication).
 */
export function useRealtimeSubscription({
  table,
  queryKey,
  filter,
  event = "*",
}: RealtimeSubscriptionOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channelName = `realtime:${table}:${filter || "all"}`

    const channelConfig = {
      event,
      schema: "public" as const,
      table,
      ...(filter ? { filter } : {}),
    }

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, () => {
        // Invalidate the relevant query to trigger a refetch
        queryClient.invalidateQueries({ queryKey })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, event, queryKey, queryClient])
}
