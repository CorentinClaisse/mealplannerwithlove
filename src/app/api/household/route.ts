import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PATCH - Update household name
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

    // Get user's profile and check if they're an owner
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

    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only household owners can update settings" },
        { status: 403 }
      )
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    const { data: household, error } = await supabase
      .from("households")
      .update(updateData)
      .eq("id", profile.household_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating household:", error)
      return NextResponse.json(
        { error: "Failed to update household" },
        { status: 500 }
      )
    }

    return NextResponse.json({ household })
  } catch (error) {
    console.error("Error updating household:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
