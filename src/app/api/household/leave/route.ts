import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// POST - Leave current household
export async function POST() {
  try {
    const { supabase, user, householdId, role } =
      await getAuthenticatedHousehold()

    // If user is owner, check if there are other members
    if (role === "owner") {
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("household_id", householdId)

      if (members && members.length > 1) {
        return NextResponse.json(
          {
            error:
              "As the owner, you must transfer ownership or remove all members before leaving",
          },
          { status: 400 }
        )
      }

      // If owner is the only member, delete the household
      // This will cascade delete all related data based on RLS policies
      await supabase
        .from("households")
        .delete()
        .eq("id", householdId)
    }

    // Create new household for the user
    const { data: newHousehold, error: createError } = await supabase
      .from("households")
      .insert({ name: "My Kitchen" })
      .select()
      .single()

    if (createError) {
      console.error("Error creating new household:", createError)
      return NextResponse.json(
        { error: "Failed to leave household" },
        { status: 500 }
      )
    }

    // Update user's profile to new household
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        household_id: newHousehold.id,
        role: "owner",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating profile:", updateError)
      return NextResponse.json(
        { error: "Failed to leave household" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
