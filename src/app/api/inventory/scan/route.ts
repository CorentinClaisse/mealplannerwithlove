import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedHousehold, handleAuthError } from "@/lib/supabase/auth-helpers"
import { callClaudeVision } from "@/lib/ai/claude"
import { FRIDGE_SCAN_PROMPT } from "@/lib/ai/prompts"
import type { FridgeScanResult, InventoryLocation } from "@/types/inventory"
import type { Json } from "@/types/database"

// POST - Scan fridge/freezer/pantry image and identify items
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, householdId } = await getAuthenticatedHousehold()
    const body = await request.json()

    const { image, location = "fridge", addToInventory = false } = body

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
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

    // Extract base64 data (strip the data:image/...;base64, prefix)
    const base64Data = image.includes(",") ? image.split(",")[1] : image

    // Call Claude Vision to analyze the image
    let aiResponse: string
    try {
      aiResponse = await callClaudeVision(
        FRIDGE_SCAN_PROMPT,
        base64Data,
        mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
      )
    } catch (aiError) {
      console.error("Claude Vision API error:", aiError)
      return NextResponse.json(
        { error: "AI analysis failed. Please check your API key and try again." },
        { status: 500 }
      )
    }

    // Parse AI response with robust JSON extraction
    let scanResult: FridgeScanResult

    try {
      // First: try direct parse
      const cleanResponse = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      scanResult = JSON.parse(cleanResponse)
    } catch {
      // Second: try to extract JSON object from surrounding text
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          scanResult = JSON.parse(jsonMatch[0])
        } else {
          console.error("No JSON found in AI response:", aiResponse.slice(0, 500))
          return NextResponse.json(
            { error: "Could not parse scan results. Please try again with a clearer photo." },
            { status: 500 }
          )
        }
      } catch (innerError) {
        console.error("Failed to parse extracted JSON:", innerError, "\nRaw response:", aiResponse.slice(0, 500))
        return NextResponse.json(
          { error: "Could not parse scan results. Please try again with a clearer photo." },
          { status: 500 }
        )
      }
    }

    // Ensure items array exists
    if (!scanResult.items || !Array.isArray(scanResult.items)) {
      scanResult.items = []
    }

    // Normalize items — fix quantity type issues (Claude may return strings)
    scanResult.items = scanResult.items.map((item) => ({
      ...item,
      name: String(item.name || "Unknown item"),
      quantity:
        typeof item.quantity === "number"
          ? item.quantity
          : typeof item.quantity === "string"
            ? parseFloat(item.quantity) || 1
            : null,
      unit: item.unit ? String(item.unit) : null,
      confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
    }))

    // Optionally add items to inventory
    const addedItems: any[] = []

    if (addToInventory && scanResult.items.length > 0) {
      // Filter items with reasonable confidence
      const validItems = scanResult.items.filter((item) => item.confidence >= 0.3)

      for (const item of validItems) {
        // Check if item exists
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("household_id", householdId)
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
              household_id: householdId,
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
        household_id: householdId,
        scanned_by: user.id,
        image_url: "",
        scan_type: location as "fridge" | "freezer" | "pantry" | "receipt",
        raw_ai_response: scanResult as unknown as Json,
        items_detected: scanResult.items.length,
        status: "completed" as const,
        processed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      scanResult,
      addedItems,
      itemsDetected: scanResult.items?.length || 0,
    })
  } catch (error) {
    console.error("Scan route error:", error)
    return handleAuthError(error)
  }
}
