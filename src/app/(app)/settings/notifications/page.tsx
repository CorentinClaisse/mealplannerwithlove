"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

interface NotificationPrefs {
  mealReminders: boolean
  shoppingListUpdates: boolean
  expiringItems: boolean
  weeklyMealPlanSummary: boolean
}

const defaultPrefs: NotificationPrefs = {
  mealReminders: false,
  shoppingListUpdates: false,
  expiringItems: false,
  weeklyMealPlanSummary: false,
}

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-8 h-5 rounded-full relative transition-colors",
        enabled ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-3.5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("notification_prefs")
      if (stored) {
        setPrefs(JSON.parse(stored))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const updatePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem("notification_prefs", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* Push Notifications */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Push Notifications
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-medium">Meal reminders</span>
                <Toggle
                  enabled={prefs.mealReminders}
                  onToggle={() => updatePref("mealReminders")}
                />
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-medium">
                  Shopping list updates
                </span>
                <Toggle
                  enabled={prefs.shoppingListUpdates}
                  onToggle={() => updatePref("shoppingListUpdates")}
                />
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-medium">Expiring items</span>
                <Toggle
                  enabled={prefs.expiringItems}
                  onToggle={() => updatePref("expiringItems")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Email
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-medium">
                  Weekly meal plan summary
                </span>
                <Toggle
                  enabled={prefs.weeklyMealPlanSummary}
                  onToggle={() => updatePref("weeklyMealPlanSummary")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground px-1">
          Push notifications require browser permission
        </p>
      </div>
    </div>
  )
}
