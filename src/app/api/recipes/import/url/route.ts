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

    // ── 1. Extract structured data BEFORE any DOM manipulation ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let structuredData: any = null
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "")

        if (data["@type"] === "Recipe") {
          structuredData = data
        }

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

    // ── 2. Extract image URL BEFORE DOM cleanup ──
    let pageImageUrl: string | null = null

    // 2a. JSON-LD image (most reliable — recipe sites always have this)
    if (structuredData) {
      const ldImage = structuredData.image
      if (typeof ldImage === "string") {
        pageImageUrl = ldImage
      } else if (Array.isArray(ldImage) && ldImage.length > 0) {
        const first = ldImage[0]
        pageImageUrl = typeof first === "string" ? first : first?.url || null
      } else if (ldImage?.url) {
        pageImageUrl = ldImage.url
      }
    }

    // 2b. OpenGraph / Twitter image
    if (!pageImageUrl) {
      pageImageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[property="og:image:url"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        $('meta[name="twitter:image:src"]').attr("content") ||
        null
    }

    // 2c. First substantial image in the page
    if (!pageImageUrl) {
      const allImages = $("img[src]")
        .toArray()
        .map((img) => ({
          src: $(img).attr("src") || "",
          width: parseInt($(img).attr("width") || "0", 10),
          height: parseInt($(img).attr("height") || "0", 10),
        }))
        .filter(
          (img) =>
            img.src &&
            !img.src.includes("icon") &&
            !img.src.includes("logo") &&
            !img.src.includes("avatar") &&
            !img.src.includes("data:image/svg") &&
            !img.src.endsWith(".svg")
        )

      // Prefer images with known large dimensions, else take the first
      const largeImage = allImages.find(
        (img) => img.width >= 200 || img.height >= 200
      )
      pageImageUrl = largeImage?.src || allImages[0]?.src || null
    }

    // Resolve relative URLs to absolute
    if (pageImageUrl && !pageImageUrl.startsWith("http")) {
      try {
        pageImageUrl = new URL(pageImageUrl, url).toString()
      } catch {
        pageImageUrl = null
      }
    }

    // ── 3. Extract metadata BEFORE cleanup ──
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim()

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content")

    // ── 4. NOW clean up DOM for text extraction ──
    $(
      "script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ad"
    ).remove()

    const recipeContent =
      $('[itemtype*="Recipe"]').html() ||
      $(".recipe, .recipe-content, #recipe, article").first().html() ||
      $("main, .content, .post-content").first().html() ||
      $("body").html()

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

    // ── 5. Use Claude to extract and structure the recipe ──
    const parsedRecipe = await extractRecipeFromText(
      contentForAI,
      URL_EXTRACT_PROMPT
    )

    parsedRecipe.sourceUrl = url
    parsedRecipe.sourceType = "url_import"

    // ── 6. Handle recipe image ──
    if (pageImageUrl) {
      let uploaded = false

      // Try to download and re-upload to Supabase Storage
      try {
        const imgResponse = await fetch(pageImageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; MealPrepBot/1.0; +https://mealprep.app)",
            Accept: "image/*",
          },
        })

        if (imgResponse.ok) {
          const contentType =
            imgResponse.headers.get("content-type") || "image/jpeg"
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
              uploaded = true
            } else {
              console.warn("Supabase upload failed:", uploadError.message)
            }
          }
        }
      } catch (err) {
        console.warn("Failed to download/upload recipe image:", err)
      }

      // Fallback: use the original external URL directly
      if (!uploaded) {
        parsedRecipe.imageUrl = pageImageUrl
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
