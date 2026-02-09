import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch current user's profile with household info
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

    // Get profile with household
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        *,
        household:households(*)
      `
      )
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      )
    }

    // Get household members if user has a household
    let members: any[] = []
    if (profile?.household_id) {
      const { data: householdMembers } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .eq("household_id", profile.household_id)

      members = householdMembers || []
    }

    return NextResponse.json({
      profile,
      members,
      email: user.email,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any
    const body = await request.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name
    }

    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating profile:", error)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
