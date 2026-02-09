"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ProfileWithHousehold,
  HouseholdMember,
  HouseholdInvitation,
  ProfileUpdateInput,
  HouseholdUpdateInput,
  InvitationInput,
} from "@/types/profile"

interface ProfileResponse {
  profile: ProfileWithHousehold
  members: HouseholdMember[]
  email: string
}

// Fetch profile
async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch("/api/profile")

  if (!response.ok) {
    throw new Error("Failed to fetch profile")
  }

  return response.json()
}

// Update profile
async function updateProfile(
  data: ProfileUpdateInput
): Promise<{ profile: ProfileWithHousehold }> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to update profile")
  }

  return response.json()
}

// Update household
async function updateHousehold(
  data: HouseholdUpdateInput
): Promise<{ household: any }> {
  const response = await fetch("/api/household", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to update household")
  }

  return response.json()
}

// Fetch invitations
async function fetchInvitations(): Promise<{
  invitations: HouseholdInvitation[]
}> {
  const response = await fetch("/api/household/invitations")

  if (!response.ok) {
    throw new Error("Failed to fetch invitations")
  }

  return response.json()
}

// Send invitation
async function sendInvitation(
  data: InvitationInput
): Promise<{ invitation: HouseholdInvitation }> {
  const response = await fetch("/api/household/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to send invitation")
  }

  return response.json()
}

// Cancel invitation
async function cancelInvitation(id: string): Promise<void> {
  const response = await fetch(`/api/household/invitations/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to cancel invitation")
  }
}

// Accept/decline invitation
async function respondToInvitation({
  id,
  action,
}: {
  id: string
  action: "accept" | "decline"
}): Promise<void> {
  const response = await fetch(`/api/household/invitations/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to respond to invitation")
  }
}

// Leave household
async function leaveHousehold(): Promise<void> {
  const response = await fetch("/api/household/leave", {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to leave household")
  }
}

// Hooks
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export function useUpdateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateHousehold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: fetchInvitations,
  })
}

export function useSendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
  })
}

export function useCancelInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
  })
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: respondToInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
  })
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: leaveHousehold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      // Invalidate all data since household changed
      queryClient.invalidateQueries({ queryKey: ["recipes"] })
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] })
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}
