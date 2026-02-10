"use client"
import { useState, useEffect, useCallback } from "react"

export interface Collection {
  id: string
  name: string
  emoji: string
  recipeIds: string[]
  createdAt: string
}

const STORAGE_KEY = "recipe_collections"

function loadCollections(): Collection[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCollections(collections: Collection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    setCollections(loadCollections())
  }, [])

  const createCollection = useCallback((name: string, emoji: string) => {
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      emoji,
      recipeIds: [],
      createdAt: new Date().toISOString(),
    }
    const updated = [...loadCollections(), newCollection]
    saveCollections(updated)
    setCollections(updated)
    return newCollection
  }, [])

  const deleteCollection = useCallback((id: string) => {
    const updated = loadCollections().filter((c) => c.id !== id)
    saveCollections(updated)
    setCollections(updated)
  }, [])

  const addRecipeToCollection = useCallback((collectionId: string, recipeId: string) => {
    const all = loadCollections()
    const updated = all.map((c) =>
      c.id === collectionId && !c.recipeIds.includes(recipeId)
        ? { ...c, recipeIds: [...c.recipeIds, recipeId] }
        : c
    )
    saveCollections(updated)
    setCollections(updated)
  }, [])

  const removeRecipeFromCollection = useCallback((collectionId: string, recipeId: string) => {
    const all = loadCollections()
    const updated = all.map((c) =>
      c.id === collectionId
        ? { ...c, recipeIds: c.recipeIds.filter((r) => r !== recipeId) }
        : c
    )
    saveCollections(updated)
    setCollections(updated)
  }, [])

  const getCollectionsForRecipe = useCallback((recipeId: string) => {
    return loadCollections().filter((c) => c.recipeIds.includes(recipeId))
  }, [])

  return {
    collections,
    createCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    getCollectionsForRecipe,
  }
}
