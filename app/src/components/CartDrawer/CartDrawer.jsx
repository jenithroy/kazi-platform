'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash, X } from '@phosphor-icons/react'
import { useCart, describeCartItems } from '../../lib/cart-context'

const filledButton =
  'inline-flex items-center justify-center h-11 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150'

export function CartDrawer({ open, onClose }) {
  const closeButtonRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()
  const { items, removeItem, updateQty, totalItems } = useCart()

  useEffect(() => {
    if (!open) return undefined

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const requestQuoteHref = `/quote?details=${encodeURIComponent(describeCartItems(items))}`

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-pine/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Bag"
            className="fixed top-0 right-0 z-[61] h-full w-full sm:w-[420px] sm:max-w-[90vw] bg-paper shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 }
            }
          >
            <div className="flex items-center justify-between px-6 h-[var(--nav-height)] border-b border-pine/15 shrink-0">
              <h2 className="font-display text-xl text-pine">
                Your Bag{items.length > 0 ? ` (${items.length})` : ''}
              </h2>
              <button
                type="button"
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close bag"
                className="inline-flex items-center justify-center w-9 h-9 text-pine hover:bg-bone transition-colors duration-150"
              >
                <X size={20} weight="regular" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
                <ShoppingBag size={40} weight="thin" className="text-pine-soft" />
                <p className="font-display text-lg text-pine">Your bag is empty</p>
                <Link href="/atelier" onClick={onClose} className={`${filledButton} mt-2`}>
                  Enter the Atelier
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <ul className="space-y-5">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex gap-3 pb-5 border-b border-pine/10 last:border-b-0 last:pb-0"
                      >
                        <div className="w-16 h-20 shrink-0 bg-paper-raised overflow-hidden">
                          {item.image && (
                            <img
                              src={item.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-pine truncate">{item.name}</p>
                          {(item.color || item.size) && (
                            <p className="font-body text-xs text-pine-soft mb-2">
                              {[item.color, item.size].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {item.price && (
                            <p className="font-mono text-xs text-pine-soft mb-2">{item.price}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border border-pine/15">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                aria-label={`Decrease quantity of ${item.name}`}
                                className="w-7 h-7 flex items-center justify-center text-pine hover:bg-bone transition-colors duration-150"
                              >
                                <Minus size={11} weight="regular" />
                              </button>
                              <span className="w-8 text-center font-mono text-xs text-pine tabular-nums">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                aria-label={`Increase quantity of ${item.name}`}
                                className="w-7 h-7 flex items-center justify-center text-pine hover:bg-bone transition-colors duration-150"
                              >
                                <Plus size={11} weight="regular" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Remove ${item.name} from bag`}
                              className="text-pine-soft hover:text-pine transition-colors duration-150"
                            >
                              <Trash size={16} weight="regular" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 py-5 border-t border-pine/15 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft">
                      Total units
                    </span>
                    <span className="font-mono text-sm text-pine tabular-nums">{totalItems}</span>
                  </div>
                  <Link
                    href={requestQuoteHref}
                    onClick={onClose}
                    className={`${filledButton} w-full`}
                  >
                    Request Bulk Quote
                  </Link>
                  <p className="font-body text-xs text-pine-soft mt-2 text-center">
                    No obligation. We reply within 24 hours.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
