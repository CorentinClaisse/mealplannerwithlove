"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, ArrowLeft, Loader2, Check } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProfile, useUpdateProfile } from "@/hooks/use-profile"

export default function ProfilePage() {
  const router = useRouter()
  const { data, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const [displayName, setDisplayName] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const profile = data?.profile
  const email = data?.email

  const handleSave = async () => {
    if (!displayName.trim()) {
      setIsEditing(false)
      return
    }

    try {
      await updateProfile.mutateAsync({ display_name: displayName.trim() })
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  const startEditing = () => {
    setDisplayName(profile?.display_name || "")
    setIsEditing(true)
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Profile" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
          <Button variant="outline" size="sm" disabled>
            Change photo (coming soon)
          </Button>
        </div>

        {/* Display name */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Display Name
          </h3>
          <Card>
            <CardContent className="p-3">
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name..."
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {profile?.display_name || "Not set"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email (read-only) */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Email
          </h3>
          <Card>
            <CardContent className="p-3">
              <span className="text-muted-foreground">{email}</span>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-1 px-1">
            Email cannot be changed
          </p>
        </div>

        {/* Account info */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Account
          </h3>
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize">{profile?.role || "member"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
