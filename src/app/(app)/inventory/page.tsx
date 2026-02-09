"use client"

import { useState } from "react"
import Link from "next/link"
import { differenceInDays, parseISO, format } from "date-fns"
import {
  Camera,
  Plus,
  Lightbulb,
  Loader2,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  useInventory,
  useAddInventoryItem,
  useDeleteInventoryItem,
} from "@/hooks/use-inventory"
import type { InventoryItem, InventoryLocation } from "@/types/inventory"
import { cn } from "@/lib/utils/cn"

const tabs: InventoryLocation[] = ["fridge", "freezer", "pantry"]
const tabEmojis: Record<InventoryLocation, string> = {
  fridge: "🧊",
  freezer: "❄️",
  pantry: "🏠",
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryLocation>("fridge")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState("")

  const { data, isLoading, error } = useInventory()
  const addItem = useAddInventoryItem()

  const items = data?.grouped?.[activeTab] || []

  const handleAddItem = async () => {
    if (!newItemName.trim()) return

    try {
      await addItem.mutateAsync({
        name: newItemName.trim(),
        quantity: null,
        unit: null,
        location: activeTab,
      })
      setNewItemName("")
      setShowAddForm(false)
    } catch (error) {
      console.error("Failed to add item:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="pb-20">
        <PageHeader title="Inventory" subtitle="Loading..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-20">
        <PageHeader title="Inventory" subtitle="Error" />
        <div className="px-4 py-8 text-center">
          <p className="text-4xl mb-2">😕</p>
          <p className="font-semibold text-foreground">Failed to load inventory</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Inventory"
        subtitle="Track what you have"
        action={
          <Link href="/inventory/suggestions">
            <button className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </button>
          </Link>
        }
      />

      <div className="px-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-muted rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200",
                activeTab === tab
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {tabEmojis[tab]} {tab}
            </button>
          ))}
        </div>

        {/* Scan button */}
        <Link href="/inventory/scan">
          <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 hover:bg-primary/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-primary">Scan with AI</p>
              <p className="text-xs text-primary/70">Take a photo to add items</p>
            </div>
          </button>
        </Link>

        {/* Items */}
        {items.length === 0 && !showAddForm ? (
          <div className="py-8 text-center">
            <p className="text-4xl mb-2">📦</p>
            <p className="font-semibold text-foreground">No items yet</p>
            <p className="text-sm text-muted-foreground">Add items or scan your {activeTab}</p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add item
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Add item section */}
        {showAddForm ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Item name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button
              onClick={handleAddItem}
              disabled={addItem.isPending || !newItemName.trim()}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              {addItem.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
        ) : items.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-bold">Add item</span>
          </button>
        )}
      </div>
    </div>
  )
}

function InventoryItemCard({ item }: { item: InventoryItem }) {
  const deleteItem = useDeleteInventoryItem()

  const getExpiryStatus = (): "expired" | "warning" | "ok" | null => {
    if (!item.expiry_date) return null

    const days = differenceInDays(parseISO(item.expiry_date), new Date())

    if (days < 0) return "expired"
    if (days <= 3) return "warning"
    return "ok"
  }

  const status = getExpiryStatus()

  const quantityDisplay = item.quantity
    ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
    : null

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-card border transition-all duration-200",
        status === "expired"
          ? "border-destructive/30"
          : status === "warning"
          ? "border-amber-500/30"
          : "border-border"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{item.name}</p>
        {quantityDisplay && (
          <p className="text-xs text-muted-foreground">{quantityDisplay}</p>
        )}
      </div>

      {item.expiry_date && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
            status === "expired"
              ? "bg-destructive/10 text-destructive"
              : status === "warning"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-secondary/10 text-secondary"
          )}
        >
          {status === "expired" && <AlertCircle className="w-3 h-3" />}
          {status === "warning" && <AlertTriangle className="w-3 h-3" />}
          {format(parseISO(item.expiry_date), "MMM d")}
        </div>
      )}

      <button
        onClick={() => deleteItem.mutate(item.id)}
        disabled={deleteItem.isPending}
        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
