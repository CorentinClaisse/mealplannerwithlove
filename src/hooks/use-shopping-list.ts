"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemInput,
} from "@/types/shopping"

// Fetch active shopping list
async function fetchShoppingList(): Promise<{ shoppingList: ShoppingList }> {
  const response = await fetch("/api/shopping-lists")

  if (!response.ok) {
    throw new Error("Failed to fetch shopping list")
  }

  return response.json()
}

// Add item to shopping list
async function addItem(
  data: ShoppingListItemInput
): Promise<{ item: ShoppingListItem }> {
  const response = await fetch("/api/shopping-lists", {
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
  data: Partial<ShoppingListItem>
}): Promise<{ item: ShoppingListItem }> {
  const response = await fetch(`/api/shopping-lists/items/${id}`, {
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
  const response = await fetch(`/api/shopping-lists/items/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete item")
  }
}

// Generate from meal plan
async function generateFromMealPlan(
  weekStart: string | undefined
): Promise<{ shoppingList: ShoppingList; itemsAdded: number }> {
  const response = await fetch("/api/shopping-lists/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekStart }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to generate shopping list")
  }

  return response.json()
}

// Clear checked items
async function clearCheckedItems(): Promise<{ itemsRemoved: number }> {
  const response = await fetch("/api/shopping-lists/clear-checked", {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to clear checked items")
  }

  return response.json()
}

// Hooks
export function useShoppingList() {
  return useQuery({
    queryKey: ["shoppingList"],
    queryFn: fetchShoppingList,
  })
}

export function useAddShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
    },
  })
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateItem,
    onMutate: async ({ id, data }) => {
      // Optimistic update for toggle
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] })

      const previous = queryClient.getQueryData<{ shoppingList: ShoppingList }>(
        ["shoppingList"]
      )

      if (previous?.shoppingList?.items) {
        queryClient.setQueryData<{ shoppingList: ShoppingList }>(
          ["shoppingList"],
          {
            shoppingList: {
              ...previous.shoppingList,
              items: previous.shoppingList.items.map((item) =>
                item.id === id ? { ...item, ...data } : item
              ),
            },
          }
        )
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["shoppingList"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
    },
  })
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteItem,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["shoppingList"] })

      const previous = queryClient.getQueryData<{ shoppingList: ShoppingList }>(
        ["shoppingList"]
      )

      if (previous?.shoppingList?.items) {
        queryClient.setQueryData<{ shoppingList: ShoppingList }>(
          ["shoppingList"],
          {
            shoppingList: {
              ...previous.shoppingList,
              items: previous.shoppingList.items.filter(
                (item) => item.id !== id
              ),
            },
          }
        )
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["shoppingList"], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
    },
  })
}

export function useToggleItemCheck() {
  const updateItem = useUpdateShoppingItem()

  return {
    ...updateItem,
    mutate: (id: string, isChecked: boolean) =>
      updateItem.mutate({ id, data: { is_checked: isChecked } }),
    mutateAsync: (id: string, isChecked: boolean) =>
      updateItem.mutateAsync({ id, data: { is_checked: isChecked } }),
  }
}

export function useGenerateFromMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateFromMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
    },
  })
}

export function useClearCheckedItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearCheckedItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] })
    },
  })
}
