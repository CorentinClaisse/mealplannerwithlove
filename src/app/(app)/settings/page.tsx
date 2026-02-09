"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  User,
  Users,
  Bell,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  MessageSquare,
  Loader2,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/hooks/use-profile"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/cn"

const settingsSections = [
  {
    title: "Account",
    items: [
      {
        href: "/settings/profile",
        icon: User,
        label: "Profile",
        description: "Name, email, avatar",
      },
      {
        href: "/settings/household",
        icon: Users,
        label: "Household",
        description: "Manage your household",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        href: "/settings/notifications",
        icon: Bell,
        label: "Notifications",
        description: "Push & email",
      },
      {
        href: "/settings/appearance",
        icon: Palette,
        label: "Appearance",
        description: "Theme & display",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        href: "/settings/help",
        icon: HelpCircle,
        label: "Help Center",
        description: "FAQs & guides",
      },
      {
        href: "/settings/feedback",
        icon: MessageSquare,
        label: "Feedback",
        description: "Send us your thoughts",
      },
    ],
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { data, isLoading } = useProfile()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const profile = data?.profile
  const email = data?.email
  const householdName = profile?.household?.name || "My Kitchen"

  return (
    <div className="pb-20">
      <PageHeader title="Settings" />

      <div className="px-4 space-y-6">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : profile ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "👩‍🍳"
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">
                  {profile.display_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{email}</p>
                <p className="text-xs text-primary font-semibold mt-0.5">
                  Household: {householdName}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                👤
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">Not signed in</p>
                <p className="text-xs text-muted-foreground">
                  Sign in to sync your data
                </p>
              </div>
              <Link href="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            </>
          )}
        </div>

        {/* Settings sections */}
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {section.items.map((item, i) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 hover:bg-muted/50 transition-colors text-left",
                      i !== section.items.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Sign out */}
        {profile && (
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm flex items-center justify-center gap-2 hover:bg-destructive/15 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Meal Prep v1.0.0
        </p>
      </div>
    </div>
  )
}
