"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  X,
  Loader2,
  ArrowLeft,
  Trash2,
  Clock,
  Copy,
  Check,
  Share2,
  AlertCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useProfile,
  useUpdateHousehold,
  useInvitations,
  useSendInvitation,
  useCancelInvitation,
  useLeaveHousehold,
} from "@/hooks/use-profile"
import { cn } from "@/lib/utils/cn"

export default function HouseholdPage() {
  const router = useRouter()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [householdName, setHouseholdName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data: profileData, isLoading: profileLoading } = useProfile()
  const { data: invitationsData } = useInvitations()
  const updateHousehold = useUpdateHousehold()
  const sendInvitation = useSendInvitation()
  const cancelInvitation = useCancelInvitation()
  const leaveHousehold = useLeaveHousehold()

  const profile = profileData?.profile
  const members = profileData?.members || []
  const invitations = invitationsData?.invitations || []
  const isOwner = profile?.role === "owner"
  const currentHouseholdName = profile?.household?.name || "My Kitchen"

  const handleUpdateName = async () => {
    if (!householdName.trim() || householdName === currentHouseholdName) {
      setIsEditingName(false)
      return
    }

    try {
      await updateHousehold.mutateAsync({ name: householdName.trim() })
      setIsEditingName(false)
    } catch (error) {
      console.error("Failed to update name:", error)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteError(null)

    try {
      const result = await sendInvitation.mutateAsync({
        email: inviteEmail.trim(),
      })
      // The API returns { invitation, inviteLink }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultAny = result as any
      const link =
        resultAny.inviteLink ||
        `${window.location.origin}/invite/${resultAny.invitation?.id}`
      setInviteLink(link)
      setInviteSuccess(true)
      setShowInviteForm(false)
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Failed to send invitation"
      )
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Fallback: select text for manual copy
      const input = document.querySelector<HTMLInputElement>(
        "input[data-invite-link]"
      )
      if (input) {
        input.select()
      }
    }
  }

  const handleShareLink = async () => {
    if (!inviteLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my household on Meal Planner",
          text: `I've invited you to join ${currentHouseholdName} on Meal Planner with Love!`,
          url: inviteLink,
        })
        return
      } catch {
        // Share cancelled or not available — fall through to copy
      }
    }
    handleCopyLink()
  }

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id)
    } catch (error) {
      console.error("Failed to cancel invite:", error)
    }
  }

  const handleDismissSuccess = () => {
    setInviteSuccess(false)
    setInviteLink(null)
    setInviteEmail("")
    setLinkCopied(false)
  }

  const handleLeave = async () => {
    if (
      !confirm(
        isOwner && members.length > 1
          ? "You must transfer ownership or remove all members before leaving."
          : "Are you sure you want to leave this household? You'll get your own household."
      )
    ) {
      return
    }

    try {
      await leaveHousehold.mutateAsync()
    } catch (error) {
      console.error("Failed to leave:", error)
    }
  }

  if (profileLoading) {
    return (
      <div>
        <PageHeader title="Household" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Household"
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-6 pb-24">
        {/* Household name */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Household Name
          </h3>
          <Card>
            <CardContent className="p-3">
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="Household name..."
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateName}
                    disabled={updateHousehold.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingName(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{currentHouseholdName}</span>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHouseholdName(currentHouseholdName)
                        setIsEditingName(true)
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Members ({members.length})
          </h3>
          <Card>
            <CardContent className="p-0 divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {(member.display_name || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.display_name || "User"}
                      {member.id === profile?.id && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </p>
                  </div>
                  {member.role === "owner" && (
                    <Crown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Activity
          </h3>
          <Card>
            <CardContent className="p-0">
              <Link
                href="/settings/household/activity"
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Recent Activity</p>
                  <p className="text-xs text-muted-foreground">
                    See what&apos;s been happening
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Invitation sent — success confirmation with shareable link */}
        {inviteSuccess && inviteLink && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
              Invitation Sent
            </h3>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-green-800">
                      Invitation created!
                    </p>
                    <p className="text-xs text-green-600">
                      Share this link with your partner so they can join your
                      household.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    data-invite-link=""
                    value={inviteLink}
                    readOnly
                    className="text-xs bg-white"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleShareLink}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissSuccess}
                  >
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending invitations */}
        {isOwner && invitations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
              Pending Invitations
            </h3>
            <Card>
              <CardContent className="p-0 divide-y">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvite(invite.id)}
                      disabled={cancelInvitation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invite partner */}
        {isOwner && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
              Invite Partner
            </h3>
            <Card>
              <CardContent className="p-3">
                {showInviteForm ? (
                  <form onSubmit={handleSendInvite} className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value)
                          setInviteError(null)
                        }}
                        placeholder="partner@email.com"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          !inviteEmail.trim() || sendInvitation.isPending
                        }
                      >
                        {sendInvitation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setShowInviteForm(false)
                          setInviteEmail("")
                          setInviteError(null)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {inviteError && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-xs">{inviteError}</p>
                      </div>
                    )}
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setShowInviteForm(true)
                      setInviteSuccess(false)
                      setInviteLink(null)
                    }}
                    className="w-full flex items-center gap-3 text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Invite your partner
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Share meal planning together
                      </p>
                    </div>
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave household */}
        {members.length > 1 && (
          <Card>
            <CardContent className="p-0">
              <button
                onClick={handleLeave}
                disabled={leaveHousehold.isPending}
                className="w-full flex items-center gap-3 p-3 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Leave household</span>
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
