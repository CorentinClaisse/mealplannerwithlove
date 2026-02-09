import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { callClaudeVision } from "@/lib/ai/claude"
import { FRIDGE_SCAN_PROMPT } from "@/lib/ai/prompts"
import type { FridgeScanResult, InventoryLocation } from "@/types/inventory"

// POST - Scan fridge/freezer/pantry image and identify items
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any
    const body = await request.json()

    const { image, location = "fridge", addToInventory = false } = body

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      )
    }

    // Get current user
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
      return NextResponse.json(
        { error: "No household found" },
        { status: 404 }
      )
    }

    // Determine media type from base64
    let mediaType = "image/jpeg"
    if (image.startsWith("data:")) {
      const match = image.match(/data:([^;]+);/)
      if (match) {
        mediaType = match[1]
      }
    }

    // Extract base64 data
    const base64Data = image.includes(",") ? image.split(",")[1] : image

    // Call Claude Vision to analyze the image
    const aiResponse = await callClaudeVision(
      FRIDGE_SCAN_PROMPT,
      base64Data,
      mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    )

    // Parse AI response
    let scanResult: FridgeScanResult

    try {
      // Clean up response - remove any markdown formatting
      const cleanResponse = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      scanResult = JSON.parse(cleanResponse)
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse)
      return NextResponse.json(
        { error: "Failed to parse scan results" },
        { status: 500 }
      )
    }

    // Optionally add items to inventory
    let addedItems: any[] = []

    if (addToInventory && scanResult.items && scanResult.items.length > 0) {
      // Filter items with reasonable confidence
      const validItems = scanResult.items.filter((item) => item.confidence >= 0.5)

      for (const item of validItems) {
        // Check if item exists
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("household_id", profile.household_id)
          .eq("location", location)
          .ilike("name", item.name)
          .single()

        if (existing) {
          // Update quantity
          const newQuantity = (existing.quantity || 0) + (item.quantity || 1)
          await supabase
            .from("inventory_items")
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
        } else {
          // Create new
          const { data: newItem } = await supabase
            .from("inventory_items")
            .insert({
              household_id: profile.household_id,
              name: item.name,
              quantity: item.quantity || null,
              unit: item.unit || null,
              location: location as InventoryLocation,
              source: "ai_scan",
              confidence_score: item.confidence,
            })
            .select()
            .single()

          if (newItem) {
            addedItems.push(newItem)
          }
        }
      }

      // Log the scan
      await supabase.from("fridge_scans").insert({
        household_id: profile.household_id,
        scanned_by: user.id,
        image_url: "", // We're not storing images for now
        scan_type: location,
        raw_ai_response: scanResult,
        items_detected: scanResult.items.length,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      scanResult,
      addedItems,
      itemsDetected: scanResult.items?.length || 0,
    })
  } catch (error) {
    console.error("Error scanning fridge:", error)
    return NextResponse.json(
      { error: "Failed to scan image" },
      { status: 500 }
    )
  }
}
