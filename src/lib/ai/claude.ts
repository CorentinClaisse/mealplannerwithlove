import Anthropic from "@anthropic-ai/sdk"

// Initialize with API key from environment
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function extractRecipeFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  prompt: string
) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  })

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : ""

  // Parse JSON from response
  try {
    return JSON.parse(responseText)
  } catch {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error("Failed to parse AI response as JSON")
  }
}

// Generic vision function for any image analysis
export async function callClaudeVision(
  prompt: string,
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}

export async function extractRecipeFromText(content: string, prompt: string) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nContent to extract from:\n${content}`,
      },
    ],
  })

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : ""

  // Parse JSON from response
  try {
    return JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error("Failed to parse AI response as JSON")
  }
}
