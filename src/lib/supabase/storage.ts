import { createClient } from "./client"

type ImageBucket = "recipe-images" | "avatars" | "scan-images"

interface UploadResult {
  url: string
  path: string
}

/**
 * Upload an image to a Supabase Storage bucket.
 */
async function uploadImage(
  bucket: ImageBucket,
  folder: string,
  file: File | Blob,
  filename?: string
): Promise<UploadResult> {
  const supabase = createClient()
  const ext = file.type.split("/")[1] || "jpg"
  const name =
    filename || `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${folder}/${name}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return { url: publicUrl, path }
}

/**
 * Upload a recipe image.
 */
export async function uploadRecipeImage(
  householdId: string,
  file: File | Blob,
  filename?: string
): Promise<UploadResult> {
  return uploadImage("recipe-images", `recipes/${householdId}`, file, filename)
}

/**
 * Upload a user avatar.
 */
export async function uploadAvatar(
  userId: string,
  file: File | Blob,
  filename?: string
): Promise<UploadResult> {
  return uploadImage("avatars", userId, file, filename)
}

/**
 * Upload a fridge/pantry scan image.
 */
export async function uploadScanImage(
  householdId: string,
  file: File | Blob,
  filename?: string
): Promise<UploadResult> {
  return uploadImage("scan-images", `scans/${householdId}`, file, filename)
}
