import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedUser,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// PATCH - Update inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()
    const body = await request.json()

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.location !== undefined) updateData.location = body.location
    if (body.expiry_date !== undefined) updateData.expiry_date = body.expiry_date

    const { data: item, error } = await supabase
      .from("inventory_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating inventory item:", error)
      return NextResponse.json(
        { error: "Failed to update item" },
        { status: 500 }
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    return handleAuthError(error)
  }
}

// DELETE - Remove inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting inventory item:", error)
      return NextResponse.json(
        { error: "Failed to delete item" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
