import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Get pending invitations for household
export async function GET() {
  try {
    const supabase = (await createClient()) as any

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's household
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single()

    if (!profile?.household_id) {
      return NextResponse.json({ invitations: [] })
    }

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from("household_invitations")
      .select("*")
      .eq("household_id", profile.household_id)
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
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Send invitation to join household
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any
    const body = await request.json()

    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.household_id) {
      return NextResponse.json(
        { error: "No household found" },
        { status: 404 }
      )
    }

    // Check if user is owner
    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only household owners can send invitations" },
        { status: 403 }
      )
    }

    // Check if email is already invited
    const { data: existingInvite } = await supabase
      .from("household_invitations")
      .select("id")
      .eq("household_id", profile.household_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      )
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from("profiles")
      .select("id")
      .eq("household_id", profile.household_id)
      .single()

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: createError } = await supabase
      .from("household_invitations")
      .insert({
        household_id: profile.household_id,
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

    // TODO: Send email notification (would use Supabase Edge Functions or Resend)
    // For now, just return the invitation

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
