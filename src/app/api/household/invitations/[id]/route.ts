import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Accept or decline invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = (await createClient()) as any
    const body = await request.json()

    const { action } = body // "accept" or "decline"

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept' or 'decline'" },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("household_invitations")
      .select("*")
      .eq("id", id)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Check if invitation is for this user's email
    if (invitation.email !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been processed" },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("household_invitations")
        .update({ status: "expired" })
        .eq("id", id)

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      )
    }

    if (action === "decline") {
      // Update invitation status
      await supabase
        .from("household_invitations")
        .update({ status: "declined" })
        .eq("id", id)

      return NextResponse.json({ success: true, action: "declined" })
    }

    // Accept invitation - join household
    // First, check if user already has a household
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single()

    if (profile?.household_id) {
      return NextResponse.json(
        { error: "You are already in a household. Leave your current household first." },
        { status: 400 }
      )
    }

    // Update user's profile to join the household
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        household_id: invitation.household_id,
        role: "member",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error joining household:", updateError)
      return NextResponse.json(
        { error: "Failed to join household" },
        { status: 500 }
      )
    }

    // Update invitation status
    await supabase
      .from("household_invitations")
      .update({ status: "accepted" })
      .eq("id", id)

    return NextResponse.json({ success: true, action: "accepted" })
  } catch (error) {
    console.error("Error processing invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Cancel/revoke invitation (by household owner)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = (await createClient()) as any

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.household_id || profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only household owners can cancel invitations" },
        { status: 403 }
      )
    }

    // Delete the invitation
    const { error } = await supabase
      .from("household_invitations")
      .delete()
      .eq("id", id)
      .eq("household_id", profile.household_id)

    if (error) {
      console.error("Error deleting invitation:", error)
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error canceling invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
