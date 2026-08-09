'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// The site's bulk-order bag: add/remove/qty for catalogue items a UK brand wants to build a
// quote request around (see COLLECTIONS_DESIGN_PLAN.md §0/§6). Deliberately no price-summing —
// product prices are "from" figures, not fixed unit prices a cart can honestly total, so the
// drawer surfaces line items and a unit count, not a currency subtotal. Persisted to
// localStorage (survives a closed tab, unlike quote-handoff.js's sessionStorage bridge, which
// only needs to survive one same-session navigation).

const CartContext = createContext(null)

const STORAGE_KEY = 'kazi-cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // corrupt/unavailable storage — start from an empty bag
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage unavailable (private browsing, quota) — cart just won't survive a reload
    }
  }, [items, hydrated])

  function addItem(item, qty) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i))
      }
      return [...prev, { ...item, qty }]
    })
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateQty(id, qty) {
    if (qty < 1) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)))
  }

  function clear() {
    setItems([])
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQty, clear, totalItems }),
    [items, totalItems],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

/** Plain-text line for the `/quote?details=` prefill — mirrors describeQuoteDesigns in quote-handoff.js. */
export function describeCartItems(items) {
  return items
    .map((item) => {
      const bits = [item.name]
      if (item.color) bits.push(item.color)
      return `- ${bits.join(', ')} — qty ${item.qty}`
    })
    .join('\n')
}
