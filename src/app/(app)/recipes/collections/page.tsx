"use client"

import { useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useCollections } from "@/hooks/use-collections"
import { Plus, FolderOpen, X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const PRESET_EMOJIS = ["🍳", "🥗", "🍝", "🍕", "🎉", "❤️", "⏱️", "🌮"]

export default function CollectionsPage() {
  const { collections, createCollection, deleteCollection } = useCollections()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS[0])

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createCollection(trimmed, selectedEmoji)
    setName("")
    setSelectedEmoji(PRESET_EMOJIS[0])
    setShowCreate(false)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm("Delete this collection? Recipes won't be deleted.")) {
      deleteCollection(id)
    }
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Collections"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Create Collection Inline Form */}
        {showCreate && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">New Collection</h3>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setName("")
                  setSelectedEmoji(PRESET_EMOJIS[0])
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emoji Picker */}
            <div className="flex gap-2 flex-wrap">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                    selectedEmoji === emoji
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Name Input + Create Button */}
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreate()
                  }
                  if (e.key === "Escape") {
                    setShowCreate(false)
                    setName("")
                    setSelectedEmoji(PRESET_EMOJIS[0])
                  }
                }}
                placeholder="Collection name..."
                className="flex-1 px-3 py-2 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                onClick={handleCreate}
                disabled={!name.trim()}
                size="sm"
                className="rounded-xl"
              >
                Create
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {collections.length === 0 && !showCreate && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your recipes into collections
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create collection
            </Button>
          </div>
        )}

        {/* Collections Grid */}
        {collections.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/recipes/collections/${collection.id}`}
              >
                <div className="bg-card rounded-2xl overflow-hidden border border-border p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in relative group">
                  <button
                    onClick={(e) => handleDelete(e, collection.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-3xl block mb-2">{collection.emoji}</span>
                  <p className="font-bold text-sm text-foreground truncate">
                    {collection.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {collection.recipeIds.length} recipe
                    {collection.recipeIds.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
