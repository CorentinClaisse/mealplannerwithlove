"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  InventoryItem,
  InventoryItemInput,
  InventoryLocation,
  FridgeScanResult,
} from "@/types/inventory"

interface InventoryResponse {
  items: InventoryItem[]
  grouped: {
    fridge: InventoryItem[]
    freezer: InventoryItem[]
    pantry: InventoryItem[]
  }
}

// Fetch inventory
async function fetchInventory(
  location?: InventoryLocation
): Promise<InventoryResponse> {
  const params = location ? `?location=${location}` : ""
  const response = await fetch(`/api/inventory${params}`)

  if (!response.ok) {
    throw new Error("Failed to fetch inventory")
  }

  return response.json()
}

// Add item
async function addItem(
  data: InventoryItemInput
): Promise<{ item: InventoryItem }> {
  const response = await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to add item")
  }

  return response.json()
}

// Update item
async function updateItem({
  id,
  data,
}: {
  id: string
  data: Partial<InventoryItem>
}): Promise<{ item: InventoryItem }> {
  const response = await fetch(`/api/inventory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to update item")
  }

  return response.json()
}

// Delete item
async function deleteItem(id: string): Promise<void> {
  const response = await fetch(`/api/inventory/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete item")
  }
}

// Scan fridge
interface ScanParams {
  image: string
  location: InventoryLocation
  addToInventory: boolean
}

interface ScanResponse {
  scanResult: FridgeScanResult
  addedItems: InventoryItem[]
  itemsDetected: number
}

async function scanFridge(params: ScanParams): Promise<ScanResponse> {
  const response = await fetch("/api/inventory/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to scan")
  }

  return response.json()
}

// Hooks
export function useInventory(location?: InventoryLocation) {
  return useQuery({
    queryKey: ["inventory", location],
    queryFn: () => fetchInventory(location),
  })
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateItem,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] })

      const previous = queryClient.getQueryData<InventoryResponse>(["inventory"])

      if (previous) {
        const updateItems = (items: InventoryItem[]) =>
          items.map((item) => (item.id === id ? { ...item, ...data } : item))

        queryClient.setQueryData<InventoryResponse>(["inventory"], {
          items: updateItems(previous.items),
          grouped: {
            fridge: updateItems(previous.grouped.fridge),
            freezer: updateItems(previous.grouped.freezer),
            pantry: updateItems(previous.grouped.pantry),
          },
        })
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["inventory"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteItem,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] })

      const previous = queryClient.getQueryData<InventoryResponse>(["inventory"])

      if (previous) {
        const filterItems = (items: InventoryItem[]) =>
          items.filter((item) => item.id !== id)

        queryClient.setQueryData<InventoryResponse>(["inventory"], {
          items: filterItems(previous.items),
          grouped: {
            fridge: filterItems(previous.grouped.fridge),
            freezer: filterItems(previous.grouped.freezer),
            pantry: filterItems(previous.grouped.pantry),
          },
        })
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["inventory"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })
}

export function useScanFridge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: scanFridge,
    onSuccess: (data) => {
      if (data.addedItems.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["inventory"] })
      }
    },
  })
}
