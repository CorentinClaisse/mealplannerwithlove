import { extractRecipeFromText } from "@/lib/ai/claude"
import { URL_EXTRACT_PROMPT } from "@/lib/ai/prompts"
import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, householdId } = await getAuthenticatedHousehold()
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MealPrepBot/1.0; +https://mealprep.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try to find JSON-LD structured data first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let structuredData: any = null
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "")

        // Handle single recipe
        if (data["@type"] === "Recipe") {
          structuredData = data
        }

        // Handle @graph array
        if (Array.isArray(data["@graph"])) {
          const recipe = data["@graph"].find(
            (item: any) => item["@type"] === "Recipe"
          )
          if (recipe) structuredData = recipe
        }
      } catch {
        // Ignore parse errors
      }
    })

    // Extract metadata
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim()

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content")

    // Remove non-content elements
    $(
      "script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ad"
    ).remove()

    // Try to find recipe-specific content
    const recipeContent =
      $('[itemtype*="Recipe"]').html() ||
      $(".recipe, .recipe-content, #recipe, article").first().html() ||
      $("main, .content, .post-content").first().html() ||
      $("body").html()

    // Convert to text and limit size
    const mainContent = cheerio
      .load(recipeContent || "")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000)

    // Build content for AI
    let contentForAI = ""

    if (structuredData) {
      contentForAI += `STRUCTURED DATA (JSON-LD):\n${JSON.stringify(structuredData, null, 2)}\n\n`
    }

    contentForAI += `PAGE TITLE: ${title}\n`
    if (description) contentForAI += `DESCRIPTION: ${description}\n`
    contentForAI += `\nPAGE CONTENT:\n${mainContent}`

    // Extract image URL from the page
    let pageImageUrl: string | null = null

    // 1. Try JSON-LD structured data image
    if (structuredData) {
      const ldImage = structuredData.image
      if (typeof ldImage === "string") {
        pageImageUrl = ldImage
      } else if (Array.isArray(ldImage) && ldImage.length > 0) {
        pageImageUrl = typeof ldImage[0] === "string" ? ldImage[0] : ldImage[0]?.url || null
      } else if (ldImage?.url) {
        pageImageUrl = ldImage.url
      }
    }

    // 2. Fallback to OpenGraph image
    if (!pageImageUrl) {
      pageImageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        null
    }

    // 3. Fallback to first large image in recipe content
    if (!pageImageUrl) {
      const recipeImages = $("img[src]")
        .toArray()
        .map((img) => $(img).attr("src"))
        .filter((src): src is string =>
          !!src && !src.includes("icon") && !src.includes("logo") && !src.includes("avatar")
        )
      if (recipeImages.length > 0) {
        pageImageUrl = recipeImages[0]
      }
    }

    // Resolve relative URLs
    if (pageImageUrl && !pageImageUrl.startsWith("http")) {
      try {
        pageImageUrl = new URL(pageImageUrl, url).toString()
      } catch {
        pageImageUrl = null
      }
    }

    // Use Claude to extract and structure the recipe
    const parsedRecipe = await extractRecipeFromText(
      contentForAI,
      URL_EXTRACT_PROMPT
    )

    // Add source URL
    parsedRecipe.sourceUrl = url
    parsedRecipe.sourceType = "url_import"

    // Download and upload the image to Supabase Storage
    if (pageImageUrl) {
      try {
        const imgResponse = await fetch(pageImageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; MealPrepBot/1.0; +https://mealprep.app)",
            Accept: "image/*",
          },
        })

        if (imgResponse.ok) {
          const contentType = imgResponse.headers.get("content-type") || "image/jpeg"
          const imgBuffer = await imgResponse.arrayBuffer()

          // Only upload reasonable-size images (under 5MB)
          if (imgBuffer.byteLength > 0 && imgBuffer.byteLength < 5 * 1024 * 1024) {
            const ext = contentType.includes("png")
              ? "png"
              : contentType.includes("webp")
                ? "webp"
                : "jpg"
            const fileName = `url-import/${householdId}/${Date.now()}.${ext}`

            const { error: uploadError } = await supabase.storage
              .from("recipe-images")
              .upload(fileName, imgBuffer, { contentType })

            if (!uploadError) {
              const {
                data: { publicUrl },
              } = supabase.storage.from("recipe-images").getPublicUrl(fileName)
              parsedRecipe.imageUrl = publicUrl
            }
          }
        }
      } catch {
        // Image download/upload failed — continue without image
        console.warn("Failed to download recipe image from:", pageImageUrl)
      }
    }

    // Log the import
    await supabase.from("recipe_imports").insert({
      household_id: householdId,
      imported_by: user.id,
      import_type: "url",
      source_url: url,
      image_url: parsedRecipe.imageUrl || null,
      raw_ai_response: parsedRecipe,
      status: "completed",
      confidence_score: parsedRecipe.confidence || 0.9,
    })

    return NextResponse.json({ recipe: parsedRecipe })
  } catch (error) {
    return handleAuthError(error)
  }
}
