import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, handleAuthError } from "@/lib/supabase/auth-helpers"

// PATCH - Update shopping list item (toggle check, edit quantity, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user } = await getAuthenticatedUser()
    const body = await request.json()

    // Prepare update data
    const updateData: Record<string, any> = {}

    if (typeof body.is_checked === "boolean") {
      updateData.is_checked = body.is_checked
      updateData.checked_at = body.is_checked ? new Date().toISOString() : null
      updateData.checked_by = body.is_checked ? user.id : null
    }

    if (body.quantity !== undefined) {
      updateData.quantity = body.quantity
    }

    if (body.unit !== undefined) {
      updateData.unit = body.unit
    }

    if (body.category !== undefined) {
      updateData.category = body.category
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    updateData.updated_at = new Date().toISOString()

    const { data: item, error } = await supabase
      .from("shopping_list_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating item:", error)
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

// DELETE - Remove item from shopping list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()

    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting item:", error)
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
