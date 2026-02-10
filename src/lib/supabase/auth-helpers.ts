import { createClient } from "./server"
import { NextResponse } from "next/server"

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type AuthenticatedContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email?: string }
  householdId: string
  role: "owner" | "member"
}

/**
 * Get authenticated user with their household context.
 * Throws AuthError if not authenticated or no household found.
 */
export async function getAuthenticatedHousehold(): Promise<AuthenticatedContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new AuthError("Unauthorized", 401)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.household_id) {
    throw new AuthError("No household found", 404)
  }

  return {
    supabase,
    user: { id: user.id, email: user.email },
    householdId: profile.household_id,
    role: profile.role,
  }
}

/**
 * Get authenticated user without requiring a household.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new AuthError("Unauthorized", 401)
  }

  return { supabase, user: { id: user.id, email: user.email } }
}

/**
 * Standard error handler for API routes using the auth helpers.
 */
export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error("Unexpected error:", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
