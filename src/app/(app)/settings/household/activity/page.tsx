"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2, ChevronLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

type ActivityItem = {
  id: string
  type: string
  title: string
  subtitle?: string
  timestamp: string
  icon: string
}

export default function ActivityPage() {
  const router = useRouter()

  const { data, isLoading } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ["household-activity"],
    queryFn: async () => {
      const res = await fetch("/api/household/activity")
      if (!res.ok) throw new Error("Failed to fetch activity")
      return res.json()
    },
  })

  const activities = data?.activities ?? []

  return (
    <div>
      <PageHeader
        title="Activity"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-3">
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      "bg-muted text-base"
                    )}
                  >
                    {activity.icon}
                  </div>
                  {index < activities.length - 1 && (
                    <div className="w-px flex-1 border-l-2 border-border my-1" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("pb-6 pt-1.5 min-w-0", index === activities.length - 1 && "pb-0")}>
                  <p className="text-sm font-medium leading-snug">{activity.title}</p>
                  {activity.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
