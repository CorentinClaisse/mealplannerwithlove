import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// GET - Get pending invitations for household
export async function GET() {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from("household_invitations")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invitations:", error)
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      )
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST - Send invitation to join household
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, householdId, role } =
      await getAuthenticatedHousehold()
    const body = await request.json()

    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user is owner
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Only household owners can send invitations" },
        { status: 403 }
      )
    }

    // Check if email is already invited
    const { data: existingInvite } = await supabase
      .from("household_invitations")
      .select("id")
      .eq("household_id", householdId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      )
    }

    // Check if email is already a member of this household
    const { data: isMember } = await supabase
      .rpc("is_email_household_member", {
        p_household_id: householdId,
        p_email: email,
      })

    if (isMember) {
      return NextResponse.json(
        { error: "This email is already a member of your household" },
        { status: 400 }
      )
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: createError } = await supabase
      .from("household_invitations")
      .insert({
        household_id: householdId,
        email: email.toLowerCase(),
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating invitation:", createError)
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      )
    }

    // TODO: Invoke the send-invitation-email edge function once deployed:
    // await supabase.functions.invoke("send-invitation-email", {
    //   body: { email: email.toLowerCase(), householdId, invitedBy: user.email },
    // })

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
