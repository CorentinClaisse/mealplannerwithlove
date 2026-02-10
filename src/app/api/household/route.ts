import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// PATCH - Update household name
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, householdId, role } = await getAuthenticatedHousehold()
    const body = await request.json()

    if (role !== "owner") {
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
      .eq("id", householdId)
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
    return handleAuthError(error)
  }
}
