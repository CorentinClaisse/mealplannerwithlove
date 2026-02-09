import type { Tables } from "./database"

export type Profile = Tables<"profiles">
export type Household = Tables<"households">
export type HouseholdInvitation = Tables<"household_invitations">

export interface ProfileWithHousehold extends Profile {
  household?: Household | null
}

export interface HouseholdMember {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: "owner" | "member"
}

export interface InvitationInput {
  email: string
}

export interface ProfileUpdateInput {
  display_name?: string
  avatar_url?: string
}

export interface HouseholdUpdateInput {
  name?: string
}
