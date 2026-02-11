"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  ArrowLeft,
  Refrigerator,
  Snowflake,
  Package,
  AlertCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useScanFridge } from "@/hooks/use-inventory"
import type { InventoryLocation, ScannedItem } from "@/types/inventory"
import { cn } from "@/lib/utils/cn"

const locationConfig = {
  fridge: { icon: Refrigerator, label: "Fridge" },
  freezer: { icon: Snowflake, label: "Freezer" },
  pantry: { icon: Package, label: "Pantry" },
}

export default function ScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [location, setLocation] = useState<InventoryLocation>("fridge")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanResults, setScanResults] = useState<ScannedItem[] | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  const scanFridge = useScanFridge()

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setImagePreview(base64)
        setScanResults(null)
        setSelectedItems(new Set())
      }
      reader.readAsDataURL(file)
    },
    []
  )

  const handleScan = async () => {
    if (!imagePreview) return

    try {
      const result = await scanFridge.mutateAsync({
        image: imagePreview,
        location,
        addToInventory: false, // First just scan, don't add yet
      })

      setScanResults(result.scanResult.items)
      // Select all items by default
      setSelectedItems(
        new Set(result.scanResult.items.map((_, index) => index))
      )
    } catch (error) {
      console.error("Scan failed:", error)
    }
  }

  const handleAddToInventory = async () => {
    if (!imagePreview || !scanResults) return

    // Filter to only selected items
    const itemsToAdd = scanResults.filter((_, index) =>
      selectedItems.has(index)
    )

    if (itemsToAdd.length === 0) return

    try {
      await scanFridge.mutateAsync({
        image: imagePreview,
        location,
        addToInventory: true,
      })

      router.push("/inventory")
    } catch (error) {
      console.error("Failed to add items:", error)
    }
  }

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const resetScan = () => {
    setImagePreview(null)
    setScanResults(null)
    setSelectedItems(new Set())
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div>
      <PageHeader
        title="Scan Inventory"
        subtitle={`Scanning ${locationConfig[location].label.toLowerCase()}`}
        action={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <X className="w-5 h-5" />
          </Button>
        }
      />

      {/* Location selector */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          {(Object.keys(locationConfig) as InventoryLocation[]).map((loc) => {
            const config = locationConfig[loc]
            const Icon = config.icon
            const isActive = location === loc

            return (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Image capture/upload area */}
        {!imagePreview ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-4 bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Take a photo or upload image</p>
                  <p className="text-sm text-muted-foreground">
                    Point at your {locationConfig[location].label.toLowerCase()}{" "}
                    contents
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Image preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-0 relative">
                <img
                  src={imagePreview}
                  alt="Fridge contents"
                  className="w-full aspect-[4/3] object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={resetScan}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Scan button or results */}
            {!scanResults ? (
              <Button
                className="w-full"
                size="lg"
                onClick={handleScan}
                disabled={scanFridge.isPending}
              >
                {scanFridge.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing image...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Scan for ingredients
                  </>
                )}
              </Button>
            ) : (
              <>
                {/* Scan results */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">
                      Found {scanResults.length} items
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedItems(
                          selectedItems.size === scanResults.length
                            ? new Set()
                            : new Set(scanResults.map((_, i) => i))
                        )
                      }
                    >
                      {selectedItems.size === scanResults.length
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-0 divide-y">
                      {scanResults.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => toggleItem(index)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                              selectedItems.has(index)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {selectedItems.has(index) && (
                              <Check className="w-3 h-3" />
                            )}
                          </div>

                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.quantity && (
                                <span>
                                  {item.quantity} {item.unit || ""}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded-full",
                                  item.confidence >= 0.8
                                    ? "bg-green-100 text-green-700"
                                    : item.confidence >= 0.5
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                )}
                              >
                                {Math.round(item.confidence * 100)}% confident
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={resetScan}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan again
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddToInventory}
                    disabled={
                      selectedItems.size === 0 || scanFridge.isPending
                    }
                  >
                    {scanFridge.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Add {selectedItems.size} items
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* Error message */}
        {scanFridge.isError && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-3 flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                {scanFridge.error instanceof Error
                  ? scanFridge.error.message
                  : "Failed to scan image. Please try again."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2">Tips for best results</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Make sure items are visible and not hidden behind others</li>
              <li>• Good lighting helps identify items more accurately</li>
              <li>• Take the photo straight on, not at an angle</li>
              <li>• You can take multiple photos of different shelves</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
