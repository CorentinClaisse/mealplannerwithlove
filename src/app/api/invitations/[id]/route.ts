import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Get invitation details (public — used by the invite page)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the invitation with household name
    const { data: invitation, error } = await supabase
      .from("household_invitations")
      .select("id, email, status, expires_at, created_at, household_id")
      .eq("id", id)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Get the household name
    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", invitation.household_id)
      .single()

    // Get the inviter's display name
    const { data: inviterProfiles } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("household_id", invitation.household_id)
      .eq("role", "owner")
      .limit(1)

    const inviterName = inviterProfiles?.[0]?.display_name || "Someone"

    // Check if expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    if (isExpired && invitation.status === "pending") {
      await supabase
        .from("household_invitations")
        .update({ status: "expired" })
        .eq("id", id)
      invitation.status = "expired"
    }

    // Check if current user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expires_at,
        householdName: household?.name || "A household",
        inviterName,
      },
      currentUserEmail: user?.email || null,
      isLoggedIn: !!user,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    )
  }
}
