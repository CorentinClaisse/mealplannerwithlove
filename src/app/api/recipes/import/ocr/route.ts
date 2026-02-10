import { extractRecipeFromImage } from "@/lib/ai/claude"
import { RECIPE_OCR_PROMPT } from "@/lib/ai/prompts"
import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, householdId } = await getAuthenticatedHousehold()

    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Use JPG, PNG, WebP, or GIF." },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 10MB." },
        { status: 400 }
      )
    }

    // Upload image to Supabase Storage
    const fileName = `ocr/${householdId}/${Date.now()}-${image.name}`
    const imageBuffer = await image.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageBuffer, {
        contentType: image.type,
      })

    let imageUrl = null
    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-images").getPublicUrl(fileName)
      imageUrl = publicUrl
    }

    // Convert to base64 for Claude
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const mediaType = image.type as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif"

    // Extract recipe using Claude Vision
    const parsedRecipe = await extractRecipeFromImage(
      base64Image,
      mediaType,
      RECIPE_OCR_PROMPT
    )

    // Add metadata
    parsedRecipe.sourceType = "ocr"
    if (imageUrl) {
      parsedRecipe.imageUrl = imageUrl
    }

    // Log import
    await supabase.from("recipe_imports").insert({
      household_id: householdId,
      imported_by: user.id,
      import_type: "ocr",
      image_url: imageUrl,
      raw_ai_response: parsedRecipe,
      status: "completed",
      confidence_score: parsedRecipe.confidence || 0.8,
    })

    return NextResponse.json({ recipe: parsedRecipe })
  } catch (error) {
    return handleAuthError(error)
  }
}
