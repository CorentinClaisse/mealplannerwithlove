"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

type ThemeOption = "light" | "dark" | "system"

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

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

export default function AppearancePage() {
  const router = useRouter()
  const [theme, setTheme] = useState<ThemeOption>("system")
  const [compactMode, setCompactMode] = useState(false)

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme_preference")
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setTheme(storedTheme)
      }
      const storedCompact = localStorage.getItem("compact_mode")
      if (storedCompact !== null) {
        setCompactMode(JSON.parse(storedCompact))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const selectTheme = (value: ThemeOption) => {
    setTheme(value)
    localStorage.setItem("theme_preference", value)
  }

  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const updated = !prev
      localStorage.setItem("compact_mode", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div>
      <PageHeader
        title="Appearance"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* Theme */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Theme
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => selectTheme(option.value)}
                  className={cn(
                    "bg-card rounded-2xl border p-4 flex flex-col items-center gap-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Display */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Display
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-3">
                <div>
                  <span className="text-sm font-medium">Compact mode</span>
                  <p className="text-xs text-muted-foreground">
                    Smaller cards and text
                  </p>
                </div>
                <Toggle enabled={compactMode} onToggle={toggleCompactMode} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
