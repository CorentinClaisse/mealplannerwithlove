"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  LogIn,
  ChefHat,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface InviteData {
  invitation: {
    id: string
    email: string
    status: string
    expiresAt: string
    householdName: string
    inviterName: string
  }
  currentUserEmail: string | null
  isLoggedIn: boolean
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [actionDone, setActionDone] = useState<"accepted" | "declined" | null>(
    null
  )

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invitations/${id}`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || "Invitation not found")
          return
        }
        const inviteData = await res.json()
        setData(inviteData)
      } catch {
        setError("Failed to load invitation")
      } finally {
        setIsLoading(false)
      }
    }
    fetchInvite()
  }, [id])

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)
    try {
      const res = await fetch(`/api/household/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to accept invitation")
      }
      setActionDone("accepted")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept")
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async () => {
    setIsDeclining(true)
    setError(null)
    try {
      const res = await fetch(`/api/household/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to decline invitation")
      }
      setActionDone("declined")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline")
    } finally {
      setIsDeclining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Success — user accepted or declined
  if (actionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            {actionDone === "accepted" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-xl font-bold">You&apos;re in!</h1>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve joined{" "}
                  <strong>{data?.invitation.householdName}</strong>. You can now
                  plan meals, share recipes, and shop together.
                </p>
                <Button className="w-full" onClick={() => router.push("/planner")}>
                  <ChefHat className="w-4 h-4 mr-2" />
                  Go to Planner
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold">Invitation declined</h1>
                <p className="text-sm text-muted-foreground">
                  No worries! You can always ask for a new invite later.
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                  Go home
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Invitation not found</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Go to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { invitation, isLoggedIn, currentUserEmail } = data
  const isExpiredOrDone = invitation.status !== "pending"
  const emailMatches =
    currentUserEmail?.toLowerCase() === invitation.email.toLowerCase()

  // Invitation expired or already used
  if (isExpiredOrDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">
              {invitation.status === "expired"
                ? "Invitation expired"
                : invitation.status === "accepted"
                  ? "Already accepted"
                  : "Invitation declined"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {invitation.status === "expired"
                ? "This invitation has expired. Ask the household owner to send a new one."
                : invitation.status === "accepted"
                  ? "This invitation has already been accepted."
                  : "This invitation was declined."}
            </p>
            <Link href={isLoggedIn ? "/planner" : "/login"}>
              <Button variant="outline" className="w-full">
                {isLoggedIn ? "Go to planner" : "Go to login"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not logged in — ask them to sign up or log in first
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">You&apos;re invited!</h1>
            <p className="text-sm text-muted-foreground">
              <strong>{invitation.inviterName}</strong> invited you to join{" "}
              <strong>{invitation.householdName}</strong> on Meal Planner with
              Love.
            </p>
            <p className="text-xs text-muted-foreground">
              Sign in with <strong>{invitation.email}</strong> to accept this
              invitation.
            </p>
            <div className="space-y-2">
              <Link href={`/login?redirect=/invite/${id}`}>
                <Button className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in to accept
                </Button>
              </Link>
              <Link href={`/signup?redirect=/invite/${id}`}>
                <Button variant="outline" className="w-full">
                  Create an account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in but email doesn't match
  if (!emailMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold">Wrong account</h1>
            <p className="text-sm text-muted-foreground">
              This invitation was sent to{" "}
              <strong>{invitation.email}</strong> but you&apos;re signed in as{" "}
              <strong>{currentUserEmail}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Sign out and sign in with the correct email to accept.
            </p>
            <Link href="/settings">
              <Button variant="outline" className="w-full">
                Go to settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in, email matches — show accept/decline
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">You&apos;re invited!</h1>
          <p className="text-sm text-muted-foreground">
            <strong>{invitation.inviterName}</strong> invited you to join{" "}
            <strong>{invitation.householdName}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Share recipes, plan meals, and manage your shopping list together.
          </p>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Accept invitation
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
