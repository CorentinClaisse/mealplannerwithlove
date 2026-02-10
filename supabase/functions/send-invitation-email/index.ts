// Deno Edge Function: Send household invitation email
// Deploy with: supabase functions deploy send-invitation-email
//
// Required env vars (set via Supabase dashboard):
//   - RESEND_API_KEY: Your Resend API key
//   - APP_URL: Your app's public URL (e.g., https://mealprep.app)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

interface InvitationPayload {
  email: string
  householdName: string
  inviterName: string
  invitationId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const {
      email,
      householdName,
      inviterName,
      invitationId,
    }: InvitationPayload = await req.json()

    // TODO: Uncomment and configure when ready to send real emails
    //
    // const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    // const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000"
    //
    // if (!RESEND_API_KEY) {
    //   throw new Error("RESEND_API_KEY is not configured")
    // }
    //
    // const res = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${RESEND_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     from: "MealPrep <noreply@mealprep.app>",
    //     to: [email],
    //     subject: `${inviterName} invited you to join their kitchen on MealPrep`,
    //     html: `
    //       <h2>You've been invited!</h2>
    //       <p><strong>${inviterName}</strong> has invited you to join
    //       "<strong>${householdName}</strong>" on MealPrep.</p>
    //       <p>Plan meals together, share recipes, and build shopping lists
    //       as a team.</p>
    //       <p>
    //         <a href="${APP_URL}/settings/household?invitation=${invitationId}"
    //            style="background:#16a34a;color:white;padding:12px 24px;
    //                   border-radius:8px;text-decoration:none;display:inline-block;">
    //           Accept Invitation
    //         </a>
    //       </p>
    //       <p style="color:#6b7280;font-size:14px;">
    //         This invitation expires in 7 days.
    //       </p>
    //     `,
    //   }),
    // })
    //
    // if (!res.ok) {
    //   const errorBody = await res.text()
    //   throw new Error(`Resend API error: ${errorBody}`)
    // }

    console.log(`[Placeholder] Would send invitation email to ${email}`)
    console.log(
      `Household: ${householdName}, Inviter: ${inviterName}, ID: ${invitationId}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sending not yet configured — see TODO in function",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
