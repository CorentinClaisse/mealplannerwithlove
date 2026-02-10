"use client"

import { useState } from "react"
import {
  Plus,
  ShoppingCart,
  Loader2,
  Trash2,
  MoreVertical,
  X,
  Package,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  useShoppingList,
  useAddShoppingItem,
  useUpdateShoppingItem,
  useDeleteShoppingItem,
  useGenerateFromMealPlan,
  useClearCheckedItems,
} from "@/hooks/use-shopping-list"
import type { ShoppingListItem } from "@/types/shopping"
import { ITEM_CATEGORIES } from "@/types/shopping"
import { cn } from "@/lib/utils/cn"

export default function ShoppingPage() {
  const [newItemName, setNewItemName] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const [deductInventory, setDeductInventory] = useState(false)

  const { data, isLoading, error } = useShoppingList()
  const addItem = useAddShoppingItem()
  const generateFromPlan = useGenerateFromMealPlan()
  const clearChecked = useClearCheckedItems()

  const items = data?.shoppingList?.items || []
  const totalItems = items.length
  const checkedItems = items.filter((i) => i.is_checked).length
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || "Other"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    },
    {} as Record<string, ShoppingListItem[]>
  )

  // Sort categories
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = ITEM_CATEGORIES.indexOf(a as any)
    const indexB = ITEM_CATEGORIES.indexOf(b as any)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  const handleAddItem = async () => {
    if (!newItemName.trim()) return

    try {
      await addItem.mutateAsync({
        name: newItemName.trim(),
        quantity: null,
      })
      setNewItemName("")
    } catch (error) {
      console.error("Failed to add item:", error)
    }
  }

  const handleGenerateFromPlan = async () => {
    try {
      await generateFromPlan.mutateAsync({ deductInventory })
      setShowMenu(false)
    } catch (error) {
      console.error("Failed to generate:", error)
    }
  }

  const handleClearChecked = async () => {
    try {
      await clearChecked.mutateAsync()
      setShowMenu(false)
    } catch (error) {
      console.error("Failed to clear:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="pb-20">
        <PageHeader title="Shopping List" subtitle="Loading..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-20">
        <PageHeader title="Shopping List" subtitle="Error" />
        <div className="px-4 py-8 text-center">
          <p className="text-4xl mb-2">😕</p>
          <p className="font-semibold text-foreground">Failed to load shopping list</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Shopping List"
        subtitle={`${checkedItems} of ${totalItems} items`}
        action={
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[200px]">
                  <button
                    onClick={() => setDeductInventory(!deductInventory)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span className="flex-1 text-left">Deduct inventory</span>
                    <span
                      className={cn(
                        "w-8 h-5 rounded-full relative transition-colors",
                        deductInventory ? "bg-secondary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                          deductInventory ? "translate-x-3.5" : "translate-x-0.5"
                        )}
                      />
                    </span>
                  </button>
                  <button
                    onClick={handleGenerateFromPlan}
                    disabled={generateFromPlan.isPending}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {generateFromPlan.isPending
                      ? "Generating..."
                      : "Generate from meal plan"}
                  </button>
                  {checkedItems > 0 && (
                    <button
                      onClick={handleClearChecked}
                      disabled={clearChecked.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {clearChecked.isPending
                        ? "Clearing..."
                        : `Clear checked (${checkedItems})`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="px-4 space-y-4">
        {/* Progress */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Add item */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add an item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleAddItem}
            disabled={addItem.isPending || !newItemName.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            {addItem.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Empty state */}
        {totalItems === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Your list is empty</p>
            <p className="text-sm text-muted-foreground">Add items or generate from your meal plan</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => generateFromPlan.mutate({ deductInventory })}
              disabled={generateFromPlan.isPending}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {generateFromPlan.isPending ? "Generating..." : "Generate from meal plan"}
            </Button>
          </div>
        )}

        {/* Items by category */}
        {sortedCategories.map((category) => (
          <CategoryGroup
            key={category}
            category={category}
            items={groupedItems[category]}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryGroup({
  category,
  items,
}: {
  category: string
  items: ShoppingListItem[]
}) {
  // Sort: unchecked first, then by name
  const sortedItems = [...items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) {
      return a.is_checked ? 1 : -1
    }
    return a.name.localeCompare(b.name)
  })

  return (
    <div>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
        {category}
      </h3>
      <div className="space-y-1.5">
        {sortedItems.map((item) => (
          <ShoppingItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function ShoppingItemRow({ item }: { item: ShoppingListItem }) {
  const updateItem = useUpdateShoppingItem()
  const deleteItem = useDeleteShoppingItem()

  const handleToggle = () => {
    updateItem.mutate({
      id: item.id,
      data: { is_checked: !item.is_checked },
    })
  }

  const handleDelete = () => {
    deleteItem.mutate(item.id)
  }

  const quantityDisplay = item.quantity
    ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
    : null

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        item.is_checked ? "bg-muted/50" : "bg-card border border-border"
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
          item.is_checked ? "bg-secondary border-secondary" : "border-border"
        )}
      >
        {item.is_checked && <span className="text-secondary-foreground text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm",
            item.is_checked ? "line-through text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {item.name}
        </span>
      </div>

      {quantityDisplay && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {quantityDisplay}
        </span>
      )}

      <button
        onClick={handleDelete}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
