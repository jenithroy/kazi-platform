'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Upload, ArrowRight, RotateCw, Plus, ChevronDown, ChevronUp, X, Type,
  Shirt, Layers, Palette, ImagePlus, BookmarkPlus, Trash2, Calculator, Check,
  MoreVertical, Copy, BringToFront, SendToBack,
} from 'lucide-react'
import {
  createImageLayer, createTextLayer, TEXT_FONTS, clamp, MIN_LAYER_OPACITY,
} from '@/lib/design-layers'
import Garment2DEditor from './Garment2DEditor'
import QtyStepper from './QtyStepper'
import { saveQuoteDesigns } from '@/lib/quote-handoff'
import {
  COLOURS, DEFAULT_COLOUR, FABRICS, GARMENTS, MODEL_CREDITS, createPresetLayers, fabricsFor, getGarment,
  isUntouchedPreset,
} from '@/lib/garments'

// react-three-fiber's <Canvas> creates a WebGL context on mount — loading it via next/dynamic
// with ssr:false keeps that (and the GLTF/Three.js module graph) out of the static-export
// prerender pass entirely, instead of just deferring it client-side the way React.lazy would.
const GarmentViewer = dynamic(() => import('./GarmentViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="font-body text-[10px] text-moss-deep tracking-[0.18em] uppercase animate-pulse">
        Loading model…
      </span>
    </div>
  ),
})

const DOCK_ITEMS = [
  { id: 'garment', label: 'Garment', icon: Shirt },
  { id: 'fabric', label: 'Fabric', icon: Layers },
  { id: 'colour', label: 'Colour', icon: Palette },
  { id: 'design', label: 'Design', icon: ImagePlus },
]

function pricePerUnit(qty) {
  if (qty >= 1000) return 3.2
  if (qty >= 500) return 4.5
  if (qty >= 200) return 6.0
  if (qty >= 100) return 7.8
  return 10.2
}

// Print surcharges layered on top of the base per-unit garment price when estimating a
// saved design: each placed image/text element is its own print run, and an all-over
// pattern covers the whole panel rather than a single spot, hence the bigger flat add-on.
const PER_ASSET_PRINT_COST = 0.75
const PATTERN_PRINT_COST = 1.5

// The Kazi logo a design starts with is a placeholder for the customer's own artwork, so it is not
// counted as print work (here, in the quote summary or in the collection).
function artworkCount(layers) {
  return layers.filter((l) => !l.isPreset).length
}

function estimateUnitPrice(entry) {
  return pricePerUnit(entry.qty) + artworkCount(entry.layers) * PER_ASSET_PRINT_COST + (entry.pattern ? PATTERN_PRINT_COST : 0)
}

// How big, and where, a new picture or text box starts on this garment (see createImageLayer). The tee
// and hoodie keep their original sizing; the garments whose 2D and 3D shapes agree keep true proportions.
// A garment with no fabric at its centre (trousers) says where to start instead (`layerAt`), mirrored
// for the back.
function newLayerOptions(garment, side) {
  const at = garment?.layerAt
  return {
    scale: garment?.layerScale ?? 1,
    areaAspect: garment?.exactAspect ? garment.areaAspect : null,
    ...(at ? { at: { x: side === 'back' ? 1 - at.x : at.x, y: at.y } } : {}),
  }
}

// Fetching a model when its button is hovered means it is already cached when it is picked.
const warmed = new Set()
function warmModel(url) {
  if (warmed.has(url)) return
  warmed.add(url)
  fetch(url).catch(() => {})
}

async function fileToAspectRatio(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1)
    img.onerror = () => resolve(1)
    img.src = url
  })
}

async function cloneImageLayerUrl(layer) {
  if (layer.type !== 'image') return layer
  try {
    const blob = await (await fetch(layer.url)).blob()
    return { ...layer, url: URL.createObjectURL(blob) }
  } catch {
    return layer
  }
}

async function cloneObjectUrl(url) {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    return URL.createObjectURL(blob)
  } catch {
    return url
  }
}

// --atelier-dock-top is the distance from the bottom of the stage to the top edge of the floating
// dock. The page measures it (the dock is taller on a phone, where "Get a Quote" sits on its own
// row) and publishes it on <html>, so the panels, the canvas, the rotate hint and the WhatsApp
// button all sit relative to the dock wherever it ends up. Until it has been measured, the
// stylesheet's per-layout default (globals.css) stands in, so nothing shifts when the page loads.
const DOCK_TOP = 'var(--atelier-dock-top, var(--atelier-dock-top-default, 5rem))'
// A bottom panel stops short of the top controls (--atelier-panel-reserve, see globals.css, leaves room for
// the front/back switch above it); a top panel (the estimate) starts below the top bar and stops above the dock.
const PANEL_GEOMETRY = {
  bottom: { bottom: `calc(${DOCK_TOP} + 1rem)`, maxHeight: `min(540px, calc(100% - ${DOCK_TOP} - 1rem - var(--atelier-panel-reserve, 7.25rem)))` },
  top: { maxHeight: `min(540px, calc(100% - ${DOCK_TOP} - 1rem - 5rem))` },
}

function ConfigPanel({ title, onClose, children, side = 'left', anchor = 'bottom', headerAction, footer, rootRef }) {
  return (
    <div
      ref={rootRef}
      style={PANEL_GEOMETRY[anchor === 'top' ? 'top' : 'bottom']}
      className={`absolute ${anchor === 'top' ? 'top-16 sm:top-20' : ''} ${side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} w-[calc(100%-1.5rem)] sm:w-[300px] bg-bone border border-pine/15 rounded-xl shadow-xl flex flex-col overflow-hidden z-20`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-pine/15 shrink-0">
        <span className="font-display text-sm text-pine">{title}</span>
        <div className="flex items-center gap-3 shrink-0">
          {headerAction}
          {/* The padding (cancelled by the negative margin) makes the tap target 32px, not the 15px icon. */}
          <button onClick={onClose} aria-label="Close panel" className="-m-2 p-2 text-pine-soft hover:text-pine transition-colors">
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* data-lenis-prevent: the site's smooth-scroll library (Lenis) otherwise intercepts the mouse
          wheel for the page — which doesn't scroll here — so this list could only be moved by
          dragging its scrollbar. overscroll-contain stops a wheel at the end of the list from
          chaining on to the page. */}
      <div data-lenis-prevent className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex-1">{children}</div>
      {footer && <div className="shrink-0 border-t border-pine/15 px-4 py-3">{footer}</div>}
    </div>
  )
}

const LAYER_MENU_ITEMS = [
  { action: 'front', label: 'Bring to Front', icon: BringToFront },
  { action: 'forward', label: 'Bring Forward', icon: ChevronUp },
  { action: 'backward', label: 'Send Backward', icon: ChevronDown },
  { action: 'back', label: 'Send to Back', icon: SendToBack },
  { action: 'duplicate', label: 'Duplicate', icon: Copy, divider: true },
  { action: 'delete', label: 'Delete', icon: Trash2, danger: true },
]

function LayerContextMenu({ x, y, onClose, onAction }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div className="fixed z-50 w-44 bg-bone border border-pine/15 rounded-lg shadow-xl py-1.5 overflow-hidden" style={{ left: x, top: y }}>
        {LAYER_MENU_ITEMS.map(({ action, label, icon: Icon, divider, danger }) => (
          <button
            key={action}
            onClick={() => { onAction(action); onClose() }}
            className={`flex items-center gap-2.5 w-full text-left px-3 py-2 font-body text-xs transition-colors ${
              divider ? 'border-t border-pine/8 mt-1 pt-2.5' : ''
            } ${danger ? 'text-red-500 hover:bg-red-50' : 'text-pine hover:bg-paper-raised'}`}
          >
            <Icon size={13} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>
    </>
  )
}

function AtelierPage() {
  const router = useRouter()
  // Seeds from a product page's "Customize in the Atelier" deep link (?garment=&colour=,
  // COLLECTIONS_DESIGN_PLAN.md §3.1) — falls back to the usual defaults for a bare /atelier
  // visit or an unrecognized value, same validate-or-default pattern as QuotePage's ?service=.
  const searchParams = useSearchParams()
  const [activePanel, setActivePanel] = useState(null)
  const [garment, setGarment] = useState(() => {
    const requested = searchParams.get('garment')
    return GARMENTS.some((g) => g.id === requested) ? requested : 't-shirt'
  })
  const [fabric, setFabric] = useState(() => getGarment(garment).defaultFabric)
  const [colour, setColour] = useState(() => {
    const requested = searchParams.get('colour')
    return COLOURS.some((c) => c.hex.toLowerCase() === requested?.toLowerCase()) ? requested : DEFAULT_COLOUR
  })
  const [pattern, setPattern] = useState(null)
  const [patternOpacity, setPatternOpacity] = useState(1)
  // A design opens with the Kazi logo placed on it (see createPresetLayers). It follows the garment
  // and colour choices until the first edit to the artwork, and is replaced by whatever the
  // customer adds.
  const [layers, setLayers] = useState(() => createPresetLayers(garment, colour))
  const [activeSide, setActiveSide] = useState('front')
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [qty, setQty] = useState(100)
  const [collection, setCollection] = useState([])
  const [showCollection, setShowCollection] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  const [estimateExcluded, setEstimateExcluded] = useState(new Set())
  const [rotateRequest, setRotateRequest] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [viewportHeight, setViewportHeight] = useState(null)
  const [viewMode, setViewMode] = useState('2d')
  const canvasAreaRef = useRef(null)
  const leftPanelRef = useRef(null)
  const dockRef = useRef(null)
  const [switchTop, setSwitchTop] = useState(null)

  // Publishes where the top edge of the floating dock is (see DOCK_TOP) as --atelier-dock-top on
  // <html>: the dock is taller on a phone, where "Get a Quote" gets a row of its own, and the
  // WhatsApp button, which lives outside this page, reads the same value to stay clear of it.
  // This writes a CSS variable straight to the DOM rather than into React state.
  useEffect(() => {
    const dock = dockRef.current
    const area = canvasAreaRef.current
    if (!dock || !area) return
    const root = document.documentElement
    function measure() {
      const top = area.getBoundingClientRect().bottom - dock.getBoundingClientRect().top
      root.style.setProperty('--atelier-dock-top', `${Math.round(top)}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(dock)
    ro.observe(area)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--atelier-dock-top')
    }
  }, [])

  // The WhatsApp button, which lives outside this page, sits where the right-hand panels end up (and a
  // phone's panels fill the width), so it steps aside while one is open (globals.css, "Atelier").
  const openPanelSide = showCollection || showEstimate ? 'right' : activePanel ? 'left' : null
  useEffect(() => {
    const root = document.documentElement
    if (openPanelSide) root.dataset.atelierPanel = openPanelSide
    else delete root.dataset.atelierPanel
    return () => { delete root.dataset.atelierPanel }
  }, [openPanelSide])

  // Mobile browsers resize their chrome (address bar, etc.) without reliably firing a
  // `dvh` recompute on a page that never scrolls — measure the true visible height directly
  // so the dock can never end up positioned underneath it. Also subtract the site's global
  // chrome above (the Nav, plus any --stripe-height banner) — unlike the source repo, this project renders those in
  // the root layout on every route instead of per-page, so the "full viewport" this page was
  // designed for is actually `100dvh` minus that chrome.
  useEffect(() => {
    const vv = window.visualViewport
    function updateHeight() {
      const rootStyle = getComputedStyle(document.documentElement)
      const chrome = ['--nav-height', '--stripe-height']
        .map((v) => parseFloat(rootStyle.getPropertyValue(v)) || 0)
        .reduce((a, b) => a + b, 0)
      setViewportHeight(Math.round((vv?.height ?? window.innerHeight) - chrome))
    }
    updateHeight()
    vv?.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    window.addEventListener('orientationchange', updateHeight)
    return () => {
      vv?.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [])

  // This page is a fixed, app-like canvas — lock out the rubber-band/overscroll bounce so
  // an errant swipe can never reveal browser chrome under the fixed dock.
  useEffect(() => {
    const prevOverscroll = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    return () => { document.body.style.overscrollBehavior = prevOverscroll }
  }, [])

  // While a left-anchored tab panel (Garment/Fabric/Colour/Design) is open, the front/back
  // switch docks just above its actual top edge instead of a guessed fixed offset — panel
  // height varies with content (a fabric list vs. an expanded layer editor), so this is
  // measured directly rather than assumed.
  useEffect(() => {
    // Resetting to null when there's no panel to measure is the "no measurement" branch of the
    // same DOM sync the ResizeObserver below performs, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activePanel) { setSwitchTop(null); return }
    const panelEl = leftPanelRef.current
    const areaEl = canvasAreaRef.current
    if (!panelEl || !areaEl) { setSwitchTop(null); return }

    const SWITCH_CLEARANCE = 52
    const MIN_TOP = 64

    function measure() {
      if (!panelEl || !areaEl) return
      const panelTop = panelEl.getBoundingClientRect().top
      const areaTop = areaEl.getBoundingClientRect().top
      setSwitchTop(Math.max(MIN_TOP, panelTop - areaTop - SWITCH_CLEARANCE))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(panelEl)
    return () => ro.disconnect()
  }, [activePanel, viewportHeight])

  // While the artwork is still the untouched Kazi logo preset, it follows the garment and colour.
  function chooseGarment(id) {
    setGarment(id)
    const next = getGarment(id)
    // Move to the new garment's usual fabric unless the customer picked one themselves (and it suits it).
    if (!next.fabrics.includes(fabric) || fabric === getGarment(garment).defaultFabric) setFabric(next.defaultFabric)
    if (isUntouchedPreset(layers, garment, colour)) setLayers(createPresetLayers(id, colour))
  }

  function chooseColour(hex) {
    setColour(hex)
    if (isUntouchedPreset(layers, garment, colour)) setLayers(createPresetLayers(garment, hex))
  }

  // On a phone the panels fill the width, so opening one closes the others; on a larger screen the
  // left-hand panels and the collection/estimate panels on the right can be open together.
  const isPhone = () => window.matchMedia('(max-width: 639px)').matches

  function togglePanel(id) {
    setActivePanel((p) => (p === id ? null : id))
    if (isPhone()) {
      setShowCollection(false)
      setShowEstimate(false)
    }
  }

  function toggleCollection() {
    setShowCollection((v) => !v)
    setShowEstimate(false)
    if (isPhone()) setActivePanel(null)
  }

  function toggleEstimate() {
    setShowEstimate((v) => !v)
    setShowCollection(false)
    if (isPhone()) setActivePanel(null)
  }

  function switchActiveSide(side) {
    setActiveSide(side)
    setSelectedLayerId((cur) => {
      if (!cur) return cur
      const layer = layers.find((l) => l.id === cur)
      return layer && layer.side !== side ? null : cur
    })
  }

  // In 3D, activeSide tracks whatever the camera is actually facing (see
  // handleFacingSideChange) — this just asks the viewer to spin to a side, and the panel
  // follows once it arrives. There's no camera in 2D, so just switch immediately.
  function requestRotateToSide(side) {
    if (side === activeSide) return
    if (viewMode === '2d') {
      switchActiveSide(side)
      return
    }
    setRotateRequest((prev) => ({ side, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  function handleFacingSideChange(side) {
    switchActiveSide(side)
  }

  function selectLayer(id) {
    setSelectedLayerId(id)
  }

  function updateLayer(id, patch) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function updateTextLayer(id, patch) {
    setLayers((prev) => prev.map((l) => (l.id === id && l.type === 'text' ? { ...l, ...patch } : l)))
  }

  function deleteLayer(id) {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id)
      if (target?.type === 'image') URL.revokeObjectURL(target.url)
      return prev.filter((l) => l.id !== id)
    })
    setSelectedLayerId((cur) => (cur === id ? null : cur))
  }

  function duplicateLayer(id) {
    const copyId = crypto.randomUUID()
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx === -1) return prev
      const original = prev[idx]
      const copy = {
        ...original,
        id: copyId,
        x: clamp(original.x + 0.04, 0, 1),
        y: clamp(original.y + 0.04, 0, 1),
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setSelectedLayerId(copyId)
  }

  // Stacking order is just array order (composeDesignCanvas + the ghost-polygon overlay both
  // render in array order, later = on top) — reordering only ever happens within the same side,
  // so the other side's layers keep their absolute slots untouched.
  function reorderLayer(id, action) {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id)
      if (!target) return prev
      const slots = []
      const sameSide = []
      prev.forEach((l, i) => {
        if (l.side === target.side) {
          slots.push(i)
          sameSide.push(l)
        }
      })
      const from = sameSide.findIndex((l) => l.id === id)
      let to = from
      if (action === 'front') to = sameSide.length - 1
      else if (action === 'back') to = 0
      else if (action === 'forward') to = Math.min(from + 1, sameSide.length - 1)
      else if (action === 'backward') to = Math.max(from - 1, 0)
      if (to === from) return prev

      const [moved] = sameSide.splice(from, 1)
      sameSide.splice(to, 0, moved)
      const next = [...prev]
      slots.forEach((slot, i) => { next[slot] = sameSide[i] })
      return next
    })
  }

  // Keyboard shortcuts for the selected layer: Delete/Backspace to remove, Escape to back out
  // of whatever's open (context menu, then selection, then panel), Cmd/Ctrl+D to duplicate,
  // Cmd/Ctrl+[ / ] to reorder, and arrow keys to nudge position (Shift for a bigger step).
  // Ignored while a text field has focus so it doesn't hijack normal typing/editing.
  useEffect(() => {
    function isEditableTarget(target) {
      if (!(target instanceof HTMLElement)) return false
      return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    }

    function onKeyDown(e) {
      if (isEditableTarget(e.target)) return

      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); return }
        if (selectedLayerId) { setSelectedLayerId(null); return }
        if (activePanel) setActivePanel(null)
        return
      }

      if (!selectedLayerId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteLayer(selectedLayerId)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateLayer(selectedLayerId)
      } else if ((e.metaKey || e.ctrlKey) && (e.key === ']' || e.key === '[')) {
        e.preventDefault()
        reorderLayer(selectedLayerId, e.key === ']' ? 'forward' : 'backward')
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const step = e.shiftKey ? 0.02 : 0.005
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        setLayers((prev) => prev.map((l) => (
          l.id === selectedLayerId ? { ...l, x: clamp(l.x + dx, 0, 1), y: clamp(l.y + dy, 0, 1) } : l
        )))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedLayerId, activePanel, contextMenu])

  function openLayerContextMenu(id, clientX, clientY) {
    const MENU_W = 176
    const MENU_H = 232
    setContextMenu({
      layerId: id,
      x: Math.min(clientX, window.innerWidth - MENU_W - 8),
      y: Math.min(clientY, window.innerHeight - MENU_H - 8),
    })
  }

  function handleLayerMenuAction(action) {
    const id = contextMenu?.layerId
    if (!id) return
    if (action === 'duplicate') duplicateLayer(id)
    else if (action === 'delete') deleteLayer(id)
    else reorderLayer(id, action)
  }

  async function handleImageInput(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const aspect = await fileToAspectRatio(url)
    const layer = createImageLayer(activeSide, url, file.name, aspect, newLayerOptions(selectedGarment, activeSide))
    setLayers((prev) => [...prev, layer])
    setSelectedLayerId(layer.id)
  }

  function addTextLayer() {
    const layer = createTextLayer(activeSide, newLayerOptions(selectedGarment, activeSide))
    setLayers((prev) => [...prev, layer])
    setSelectedLayerId(layer.id)
  }

  function handlePatternInput(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPattern((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function removePattern() {
    setPattern((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  // Clears the working design back to a fresh default — used after saving to the collection,
  // so "save" reads as "file this away and start the next one" rather than just a bookmark.
  function startNewDesign() {
    setLayers((prev) => {
      prev.forEach((l) => { if (l.type === 'image') URL.revokeObjectURL(l.url) })
      return createPresetLayers('t-shirt', DEFAULT_COLOUR)
    })
    setPattern((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPatternOpacity(1)
    setGarment('t-shirt')
    setFabric(getGarment('t-shirt').defaultFabric)
    setColour(DEFAULT_COLOUR)
    setQty(100)
    setSelectedLayerId(null)
    setActiveSide('front')
  }

  async function addToCollection() {
    // Mint independent object URLs for the snapshot — the live layers' (and pattern's) URLs
    // get revoked once startNewDesign clears the working design, which would otherwise break
    // this saved entry's thumbnail/fill.
    const [snapshotLayers, snapshotPattern] = await Promise.all([
      Promise.all(layers.map(cloneImageLayerUrl)),
      cloneObjectUrl(pattern),
    ])
    setCollection((prev) => [
      { id: crypto.randomUUID(), garment, fabric, colour, pattern: snapshotPattern, patternOpacity, qty, layers: snapshotLayers },
      ...prev,
    ])
    setShowCollection(true)
    startNewDesign()
  }

  // Swaps the working design for a saved one — clones fresh object URLs (and layer ids) so
  // editing/deleting here can't revoke the URLs the collection entry itself still depends on.
  async function loadFromCollection(entry) {
    const [workingLayers, workingPattern] = await Promise.all([
      Promise.all(entry.layers.map(async (l) => ({ ...(await cloneImageLayerUrl(l)), id: crypto.randomUUID() }))),
      cloneObjectUrl(entry.pattern),
    ])
    setLayers((prev) => {
      prev.forEach((l) => { if (l.type === 'image') URL.revokeObjectURL(l.url) })
      return workingLayers
    })
    setPattern((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return workingPattern
    })
    setPatternOpacity(entry.patternOpacity)
    setGarment(entry.garment)
    setFabric(entry.fabric)
    setColour(entry.colour)
    setQty(entry.qty)
    setSelectedLayerId(null)
    setActiveSide('front')
    setShowCollection(false)
  }

  function removeFromCollection(id) {
    setCollection((prev) => {
      const target = prev.find((entry) => entry.id === id)
      target?.layers.forEach((l) => { if (l.type === 'image') URL.revokeObjectURL(l.url) })
      if (target?.pattern) URL.revokeObjectURL(target.pattern)
      return prev.filter((entry) => entry.id !== id)
    })
    setEstimateExcluded((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function toggleEstimateEntry(id) {
    setEstimateExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateCollectionQty(id, nextQty) {
    const clamped = clamp(nextQty, 10, 5000)
    setCollection((prev) => prev.map((entry) => (entry.id === id ? { ...entry, qty: clamped } : entry)))
  }

  const selectedColour = COLOURS.find((c) => c.hex.toLowerCase() === colour.toLowerCase())
  const selectedFabric = FABRICS.find((f) => f.id === fabric)
  const selectedGarment = getGarment(garment)
  const sideLayers = layers.filter((l) => l.side === activeSide)
  const currentThumb = layers.find((l) => l.type === 'image')
  const garmentFabrics = fabricsFor(garment)

  const estimateEntries = collection.filter((entry) => !estimateExcluded.has(entry.id))
  const estimateTotalQty = estimateEntries.reduce((sum, entry) => sum + entry.qty, 0)
  const estimateGrandTotal = estimateEntries.reduce((sum, entry) => sum + estimateUnitPrice(entry) * entry.qty, 0)

  // Snapshots the current in-progress design plus everything saved in the collection into a
  // plain-language summary (resolved labels, not raw ids) and hands it to the dedicated
  // /atelier/quote page via sessionStorage — this site has no separate checkout flow, so
  // /atelier/quote is the real landing point for every "Get a Quote" click.
  function buildQuoteDesigns() {
    // Carries the raw garment id + pattern opacity (not just resolved labels) so the quote
    // page can re-render an actual GarmentMockup2D preview instead of a flat colour swatch.
    const toQuoteDesign = (id, g, f, c, pat, patOpacity, dqty, dlayers) => ({
      id,
      garment: g,
      garmentLabel: getGarment(g)?.label ?? g,
      fabricLabel: FABRICS.find((x) => x.id === f)?.label ?? f,
      colourLabel: COLOURS.find((x) => x.hex.toLowerCase() === c.toLowerCase())?.label ?? c,
      colourHex: c,
      hasPattern: !!pat,
      patternThumb: pat,
      patternOpacity: patOpacity,
      assetThumb: dlayers.find((l) => l.type === 'image' && !l.isPreset)?.url ?? null,
      layerCount: artworkCount(dlayers),
      qty: dqty,
    })

    return [
      toQuoteDesign('current', garment, fabric, colour, pattern, patternOpacity, qty, layers),
      ...collection.map((entry) => toQuoteDesign(entry.id, entry.garment, entry.fabric, entry.colour, entry.pattern, entry.patternOpacity, entry.qty, entry.layers)),
    ]
  }

  function handleQuoteClick() {
    saveQuoteDesigns(buildQuoteDesigns())
    router.push('/atelier/quote')
  }

  return (
    <div
      className="overflow-hidden bg-paper relative h-[calc(100dvh-var(--nav-height)-var(--stripe-height))]"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
    >
      <h1 className="sr-only">Design your garment in the Kazi Atelier</h1>
      <div className="absolute inset-0">
        <div ref={canvasAreaRef} className="relative w-full h-full bg-paper-raised/40 overflow-hidden">

          {/* Canvas — clear of the dock below and, on a compact layout (see globals.css), of the controls above */}
          <div
            className="absolute inset-x-0"
            style={{ top: 'var(--atelier-canvas-top, 0px)', bottom: `calc(${DOCK_TOP} + var(--atelier-canvas-gap, 2rem))` }}
          >
            {viewMode === '2d' ? (
              <Garment2DEditor
                garment={garment}
                colour={colour}
                pattern={pattern}
                patternOpacity={patternOpacity}
                layers={layers}
                activeSide={activeSide}
                selectedLayerId={selectedLayerId}
                onSelectLayer={selectLayer}
                onUpdateLayer={updateLayer}
                onDeleteLayer={deleteLayer}
                onLayerContextMenu={openLayerContextMenu}
              />
            ) : (
              <GarmentViewer
                garment={garment}
                colour={colour}
                pattern={pattern}
                patternOpacity={patternOpacity}
                layers={layers}
                activeSide={activeSide}
                selectedLayerId={selectedLayerId}
                onSelectLayer={selectLayer}
                onUpdateLayer={updateLayer}
                onDeleteLayer={deleteLayer}
                onLayerContextMenu={openLayerContextMenu}
                onFacingSideChange={handleFacingSideChange}
                rotateRequest={rotateRequest}
              />
            )}
          </div>

          {/* Live summary — top left */}
          <div className="absolute top-4 left-4 sm:left-6 z-10 flex items-center gap-1.5 sm:gap-2 max-w-[60vw] sm:max-w-none px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-bone/90 backdrop-blur-sm border border-pine/15 rounded-lg">
            <span className="font-display text-xs text-pine whitespace-nowrap shrink-0">{selectedGarment?.label ?? garment}</span>
            <span className="text-pine/20 shrink-0">·</span>
            <span className="font-body text-[10px] tracking-[0.18em] text-pine-soft uppercase whitespace-nowrap truncate max-w-[90px] sm:max-w-none">
              {selectedFabric?.label ?? fabric} · {selectedColour?.label ?? colour}
            </span>
          </div>

          {/* Estimate — top right; expands into a per-design pricing breakdown for the
              collection instead of just quoting the current garment's per-unit price. */}
          <button
            onClick={toggleEstimate}
            title="Estimate pricing for your saved designs" aria-label="Estimate pricing"
            aria-pressed={showEstimate}
            className={`absolute top-4 right-4 sm:right-6 z-10 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 border rounded-lg transition-colors duration-150 ${
              showEstimate ? 'bg-pine border-pine' : 'bg-bone/90 backdrop-blur-sm border-pine/15 hover:border-pine/40'
            }`}
          >
            <Calculator size={13} strokeWidth={1.5} className={showEstimate ? 'text-moss-deep' : 'text-moss-deep'} />
            <span className={`font-body text-[10px] tracking-[0.18em] uppercase whitespace-nowrap ${showEstimate ? 'text-bone' : 'text-pine'}`}>
              Estimate
            </span>
          </button>

          {/* Front/Back — a single sliding switch, left edge, styled to match the config
              panels. Centered vertically by default; a panel opening (Fabric, etc.) is also
              left-anchored and would grow right under it, so it docks just above that panel's
              own (measured) top edge while one is open, instead of either getting buried
              underneath or jumping all the way to the top of the screen. */}
          <div
            className={`atelier-switch absolute left-4 sm:left-6 z-10 transition-[top] duration-200 ease-out ${
              switchTop === null ? 'top-1/2 -translate-y-1/2' : 'top-[var(--switch-top)]'
            }`}
            // On a compact layout (portrait phone, short screen) globals.css moves the switch into the top
            // controls instead; the estimate panel opens over a portrait phone's switch row, hence the flag.
            data-estimate-open={showEstimate ? '' : undefined}
            style={switchTop !== null ? { '--switch-top': `${switchTop}px` } : undefined}
          >
            <div className="relative flex p-1 w-24 sm:w-28 bg-bone border border-pine/15 rounded-full shadow-xl" role="group" aria-label="Front or back">
              <span
                aria-hidden
                className="absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-pine transition-transform duration-200 ease-out"
                style={{ transform: activeSide === 'back' ? 'translateX(100%)' : 'translateX(0%)' }}
              />
              {['front', 'back'].map((side) => (
                <button key={side} onClick={() => requestRotateToSide(side)} title={`Show ${side}`}
                  aria-pressed={activeSide === side}
                  className={`relative z-10 flex-1 h-8 sm:h-9 flex items-center justify-center rounded-full font-body text-[9px] tracking-[0.18em] uppercase transition-colors duration-150 ${
                    activeSide === side ? 'text-bone' : 'text-pine-soft hover:text-pine'
                  }`}>
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Rotate hint */}
          {viewMode === '3d' && (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 border border-pine/15 bg-bone/85 backdrop-blur-sm rounded-full z-10"
              style={{ bottom: `calc(${DOCK_TOP} + 1rem)` }}
            >
              <RotateCw size={11} className="text-pine-soft" strokeWidth={1.5} />
              <span className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase">Drag to rotate</span>
            </div>
          )}

          {/* ── Contextual panel ── */}
          {activePanel === 'garment' && (
            <ConfigPanel title="Garment" onClose={() => setActivePanel(null)} rootRef={leftPanelRef}>
              <div className="space-y-2.5">
                {GARMENTS.map((g) => (
                  <button key={g.id} onClick={() => chooseGarment(g.id)}
                    onPointerEnter={() => warmModel(g.model)} onFocus={() => warmModel(g.model)}
                    aria-pressed={garment === g.id}
                    className={`relative flex w-full items-center gap-3 text-left border px-3 py-2.5 transition-all duration-200 ${
                      garment === g.id ? 'border-pine bg-pine text-bone' : 'border-pine/15 bg-bone hover:border-pine/40 text-pine'
                    }`}>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-paper-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.thumb} alt="" width={48} height={48} loading="lazy" className="h-10 w-10 object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-body text-[9px] tracking-[0.18em] uppercase mb-0.5 ${garment === g.id ? 'text-bone/70' : 'text-pine-soft'}`}>{g.code}</span>
                      <span className="block font-display text-sm leading-tight">{g.label}</span>
                      <span className={`block font-body text-xs leading-snug ${garment === g.id ? 'text-bone/60' : 'text-pine-soft'}`}>{g.desc}</span>
                    </span>
                    {garment === g.id && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-moss" />}
                  </button>
                ))}
              </div>

              {/* Several of the 3D models are other artists' work, shared under CC BY, which asks for credit. */}
              {MODEL_CREDITS.length > 0 && (
                <details className="mt-4 border-t border-pine/15 pt-3">
                  <summary className="cursor-pointer font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase hover:text-pine">
                    3D model credits
                  </summary>
                  <ul className="mt-2.5 space-y-2 font-body text-[10px] leading-snug text-pine-soft">
                    {MODEL_CREDITS.map((c) => (
                      <li key={c.garment}>
                        <span className="text-pine">{c.garment}:</span> &ldquo;
                        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-pine">{c.title}</a>
                        &rdquo; by{' '}
                        <a href={c.authorUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-pine">{c.author}</a>
                        , <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-pine">{c.licenseShort}</a>.
                        Adapted for this site.
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </ConfigPanel>
          )}

          {activePanel === 'fabric' && (
            <ConfigPanel title="Fabric" onClose={() => setActivePanel(null)} rootRef={leftPanelRef}>
              <div className="space-y-2.5">
                {garmentFabrics.map((f) => (
                  <button key={f.id} onClick={() => setFabric(f.id)}
                    className={`w-full text-left border px-4 py-3 transition-all duration-200 ${
                      fabric === f.id ? 'border-pine bg-pine text-bone' : 'border-pine/15 bg-bone hover:border-pine/40'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-body text-[9px] tracking-[0.18em] uppercase ${fabric === f.id ? 'text-bone/70' : 'text-pine-soft'}`}>{f.code}</span>
                      <span className={`font-body text-[10px] border px-1.5 py-0.5 ${fabric === f.id ? 'border-bone/30 text-bone' : 'border-pine/15 text-pine-soft'}`}>{f.spec}</span>
                    </div>
                    <p className={`font-display text-sm mb-0.5 ${fabric === f.id ? 'text-bone' : 'text-pine'}`}>{f.label}</p>
                    <p className={`font-body text-xs leading-snug ${fabric === f.id ? 'text-bone/60' : 'text-pine-soft'}`}>{f.detail}</p>
                  </button>
                ))}
              </div>
            </ConfigPanel>
          )}

          {activePanel === 'colour' && (
            <ConfigPanel title="Colour" onClose={() => setActivePanel(null)} rootRef={leftPanelRef}>
              <div className="flex items-center gap-3 p-3 border border-pine/15 mb-4">
                <input
                  type="color"
                  value={colour}
                  onChange={(e) => chooseColour(e.target.value)}
                  aria-label="Pick a custom colour"
                  className="w-11 h-11 border border-pine/15 cursor-pointer bg-bone p-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-display text-xs text-pine truncate">{selectedColour?.label ?? 'Custom'}</p>
                  <p className="font-body text-[10px] text-pine-soft">{colour.toUpperCase()}</p>
                </div>
              </div>

              <p className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase mb-2.5">Quick picks</p>
              <div className="grid grid-cols-6 gap-2 mb-5">
                {COLOURS.map((c) => (
                  <button key={c.hex} onClick={() => chooseColour(c.hex)} title={c.label}
                    className={`w-8 h-8 border-2 transition-all duration-200 ${
                      colour.toLowerCase() === c.hex.toLowerCase() ? 'border-pine scale-110 shadow-sm' : 'border-pine/15 hover:border-pine/40'
                    }`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>

              <div className="flex items-center justify-between mb-2.5">
                <p className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase">Custom pattern</p>
                {pattern && (
                  <button onClick={removePattern} className="font-body text-[9px] tracking-[0.18em] text-pine-soft hover:text-red-500 uppercase transition-colors">
                    Remove
                  </button>
                )}
              </div>
              {pattern ? (
                <div className="border border-pine/15 p-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 border border-pine/15 shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pattern} alt="" className="w-full h-full object-cover" />
                    </div>
                    <p className="font-body text-[10px] text-pine-soft leading-relaxed">
                      Tiled across the whole garment, under any images or text.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-pine/8">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase">Pattern opacity</span>
                      <span className="font-body text-[10px] text-pine">{Math.round(patternOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range" min={0.1} max={1} step={0.01}
                      value={patternOpacity}
                      onChange={(e) => setPatternOpacity(Number(e.target.value))}
                      className="w-full h-0.5 bg-pine/15 appearance-none cursor-pointer"
                      style={{ accentColor: '#3F8F5C' }}
                    />
                  </div>
                </div>
              ) : (
                <label className="relative flex items-center justify-center gap-1.5 py-3.5 border-2 border-dashed border-pine/15 hover:border-moss/50 bg-bone cursor-pointer transition-all duration-200">
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handlePatternInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className="w-4 h-4 text-pine-soft" strokeWidth={1.5} />
                  <span className="font-body text-[10px] text-pine">Upload a pattern</span>
                </label>
              )}
            </ConfigPanel>
          )}

          {activePanel === 'design' && (
            <ConfigPanel title="Design" onClose={() => setActivePanel(null)} rootRef={leftPanelRef}>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <label className="relative flex flex-col items-center justify-center gap-1.5 py-4 border-2 border-dashed border-pine/15 hover:border-moss/50 bg-bone cursor-pointer transition-all duration-200">
                  <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={handleImageInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className="w-4 h-4 text-pine-soft" strokeWidth={1.5} />
                  <span className="font-body text-[10px] text-pine">Add Image</span>
                </label>
                <button onClick={addTextLayer}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 border-2 border-dashed border-pine/15 hover:border-moss/50 bg-bone transition-all duration-200">
                  <Type className="w-4 h-4 text-pine-soft" strokeWidth={1.5} />
                  <span className="font-body text-[10px] text-pine">Add Text</span>
                </button>
              </div>

              {sideLayers.length === 0 ? (
                <p className="font-body text-xs text-pine-soft leading-relaxed">
                  No elements on the {activeSide} yet. Add an image or text, then drag it directly on the model to position and resize it.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...sideLayers].reverse().map((layer) => (
                    <div key={layer.id}>
                      <button onClick={() => selectLayer(layer.id)}
                        className={`flex items-center gap-2.5 w-full text-left p-2 border transition-colors ${
                          selectedLayerId === layer.id ? 'border-pine bg-pine/5' : 'border-pine/15 hover:border-pine/30'
                        }`}>
                        <div className="w-8 h-8 border border-pine/15 shrink-0 flex items-center justify-center bg-bone overflow-hidden">
                          {layer.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={layer.url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Type size={13} strokeWidth={1.5} className="text-pine-soft" />
                          )}
                        </div>
                        <span className="flex-1 min-w-0 font-body text-xs text-pine truncate">
                          {layer.type === 'image' ? layer.fileName : (layer.text || 'Text')}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Layer options"
                          className="text-pine-soft hover:text-pine transition-colors shrink-0 p-0.5 -m-0.5"
                          onClick={(e) => { e.stopPropagation(); openLayerContextMenu(layer.id, e.clientX, e.clientY) }}
                        >
                          <MoreVertical size={14} strokeWidth={1.5} />
                        </span>
                      </button>

                      {selectedLayerId === layer.id && (
                        <div className="mt-2 mb-1 p-2.5 border border-pine/8 space-y-2.5">
                          {layer.type === 'text' && (
                            <>
                              <input
                                type="text"
                                value={layer.text}
                                onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
                                placeholder="Your text"
                                // 16px on a phone: iOS Safari zooms the whole page in when a smaller text field is focused.
                                className="w-full border border-pine/15 px-2.5 py-1.5 font-body text-base sm:text-xs text-pine focus:outline-none focus:border-pine"
                              />
                              <div className="flex items-center gap-2">
                                {TEXT_FONTS.map((f) => (
                                  <button key={f.value} onClick={() => updateTextLayer(layer.id, { fontFamily: f.value })}
                                    style={{ fontFamily: f.value }}
                                    className={`px-2 py-1 border text-xs transition-colors ${
                                      layer.fontFamily === f.value ? 'border-pine bg-pine text-bone' : 'border-pine/15 text-pine hover:border-pine/40'
                                    }`}>
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="color"
                                  value={layer.color}
                                  onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })}
                                  aria-label="Text colour"
                                  className="w-8 h-8 border border-pine/15 cursor-pointer bg-bone p-0.5"
                                />
                                <span className="font-body text-[10px] text-pine-soft uppercase">{layer.color}</span>
                              </div>
                            </>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase">Opacity</span>
                              <span className="font-body text-[10px] text-pine">{Math.round(layer.opacity * 100)}%</span>
                            </div>
                            <input
                              type="range" min={MIN_LAYER_OPACITY} max={1} step={0.01}
                              value={layer.opacity}
                              onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                              className="w-full h-0.5 bg-pine/15 appearance-none cursor-pointer"
                              style={{ accentColor: '#3F8F5C' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ConfigPanel>
          )}

          {showCollection && (
            <ConfigPanel
              title={`Collection${collection.length ? ` (${collection.length})` : ''}`}
              onClose={() => setShowCollection(false)}
              side="right"
            >
              <div className="space-y-2.5">
                {/* Current design — always shown live, so the piece on the canvas right now
                    is never hidden behind a save step. */}
                <div>
                  <p className="font-body text-[9px] tracking-[0.18em] text-moss-deep uppercase mb-1.5">Currently editing</p>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowCollection(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCollection(false) } }}
                    title="Back to editing"
                    className="flex items-center gap-3 border border-pine bg-pine/5 p-2.5 cursor-pointer"
                  >
                    <div className="relative w-11 h-11 border border-pine/15 shrink-0 overflow-hidden" style={{ backgroundColor: colour }}>
                      {pattern ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pattern} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : currentThumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentThumb.url} alt="" className="absolute inset-0 w-full h-full object-contain p-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xs text-pine truncate">{selectedGarment?.label ?? garment}</p>
                      <p className="font-body text-[10px] text-pine-soft truncate">
                        {selectedFabric?.label ?? fabric} · {selectedColour?.label ?? colour}
                        {artworkCount(layers) > 0 && ` · ${artworkCount(layers)} el.`}
                      </p>
                    </div>
                  </div>
                </div>

                <button onClick={addToCollection}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-pine/15 hover:border-moss/50 bg-bone transition-colors duration-200">
                  <Plus size={14} strokeWidth={1.5} className="text-pine-soft" />
                  <span className="font-body text-[10px] text-pine">Add New Design</span>
                </button>

                {collection.length > 0 && (
                  <>
                    <p className="font-body text-[9px] tracking-[0.18em] text-pine-soft uppercase pt-1">Saved</p>
                    {collection.map((entry) => {
                      const g = getGarment(entry.garment)
                      const f = FABRICS.find((x) => x.id === entry.fabric)
                      const c = COLOURS.find((x) => x.hex.toLowerCase() === entry.colour.toLowerCase())
                      const thumb = entry.layers.find((l) => l.type === 'image')
                      return (
                        <div key={entry.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => loadFromCollection(entry)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadFromCollection(entry) } }}
                          title="Load this design"
                          className="flex items-center gap-3 border border-pine/15 p-2.5 cursor-pointer hover:border-pine/40 transition-colors"
                        >
                          <div className="relative w-11 h-11 border border-pine/15 shrink-0 overflow-hidden" style={{ backgroundColor: entry.colour }}>
                            {entry.pattern ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.pattern} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb.url} alt="" className="absolute inset-0 w-full h-full object-contain p-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-xs text-pine truncate">{g?.label ?? entry.garment}</p>
                            <p className="font-body text-[10px] text-pine-soft truncate">
                              {f?.label ?? entry.fabric} · {c?.label ?? entry.colour}
                              {artworkCount(entry.layers) > 0 && ` · ${artworkCount(entry.layers)} el.`}
                            </p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeFromCollection(entry.id) }} aria-label="Remove from collection"
                            className="text-pine-soft hover:text-red-500 transition-colors shrink-0">
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </ConfigPanel>
          )}

          {showEstimate && (
            <ConfigPanel
              title="Estimate Price"
              onClose={() => setShowEstimate(false)}
              side="right"
              anchor="top"
              footer={collection.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body text-[8px] tracking-[0.18em] text-pine-soft uppercase truncate">
                        {estimateEntries.length} design{estimateEntries.length === 1 ? '' : 's'} · {estimateTotalQty} units
                      </p>
                      <p className="font-display text-xs text-pine">Estimated Total</p>
                    </div>
                    <span className="font-display text-lg text-moss-deep shrink-0">£{estimateGrandTotal.toFixed(2)}</span>
                  </div>
                  <p className="font-body text-[9px] text-pine-soft leading-relaxed">
                    Indicative only — your formal quote confirms final pricing.
                  </p>
                </div>
              ) : undefined}
            >
              {collection.length === 0 ? (
                <p className="font-body text-xs text-pine-soft leading-relaxed">
                  No saved designs yet. Save a design to your collection to estimate pricing for it.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {collection.map((entry) => {
                    const g = getGarment(entry.garment)
                    const c = COLOURS.find((x) => x.hex.toLowerCase() === entry.colour.toLowerCase())
                    const selected = !estimateExcluded.has(entry.id)
                    const unit = estimateUnitPrice(entry)
                    return (
                      <div key={entry.id}
                        className={`border p-2.5 transition-colors ${
                          selected ? 'border-pine bg-pine/5' : 'border-pine/15 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button onClick={() => toggleEstimateEntry(entry.id)} aria-pressed={selected}
                            aria-label={selected ? 'Exclude from estimate' : 'Include in estimate'}
                            className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                              selected ? 'bg-pine border-pine' : 'border-pine/15'
                            }`}>
                            {selected && <Check size={11} strokeWidth={2.5} className="text-bone" />}
                          </button>
                          <button onClick={() => toggleEstimateEntry(entry.id)} className="flex-1 min-w-0 text-left">
                            <p className="font-display text-xs text-pine truncate">{g?.label ?? entry.garment} · {c?.label ?? entry.colour}</p>
                            <p className="font-body text-[10px] text-pine-soft truncate">
                              {artworkCount(entry.layers) > 0 && `${artworkCount(entry.layers)} asset${artworkCount(entry.layers) > 1 ? 's' : ''}`}
                              {entry.pattern && (artworkCount(entry.layers) > 0 ? ' · pattern' : 'Pattern')}
                              {artworkCount(entry.layers) === 0 && !entry.pattern && 'No custom artwork'}
                            </p>
                          </button>
                          <span className="font-body text-[11px] text-pine font-medium shrink-0">
                            £{unit.toFixed(2)}<span className="text-pine-soft">/u</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-pine/8">
                          <div className="flex items-center gap-1.5">
                            <QtyStepper value={entry.qty} onChange={(next) => updateCollectionQty(entry.id, next)} />
                            <span className="font-body text-[8px] text-pine-soft uppercase tracking-[0.18em]">units</span>
                          </div>
                          <span className="font-body text-[10px] text-pine-soft">
                            <span className="text-pine font-medium">£{(unit * entry.qty).toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ConfigPanel>
          )}

          {contextMenu && (
            <LayerContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onAction={handleLayerMenuAction}
            />
          )}

          {/* ── Floating dock ──
              One row on anything wider than a portrait phone. On a portrait phone the one-row dock is
              wider than the screen — it scrolled sideways and cut "Get a Quote" off — so it becomes two
              rows: the tools, then a full-width "Get a Quote". Its measured height drives the layout
              above it (see DOCK_TOP). */}
          <div
            ref={dockRef}
            className="absolute left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1.5rem)] max-sm:portrait:w-[calc(100%-1.5rem)] bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] [@media(max-height:520px)]:bottom-[calc(0.5rem_+_env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center gap-0.5 sm:gap-1 bg-pine rounded-2xl px-1.5 sm:px-2 py-2 shadow-xl overflow-x-auto max-sm:portrait:flex-col max-sm:portrait:items-stretch max-sm:portrait:gap-2 max-sm:portrait:p-2">
              <div className="flex items-center gap-0.5 sm:gap-1 max-sm:portrait:justify-between">
                <div className="flex items-center bg-bone/10 rounded-lg p-0.5 shrink-0" role="group" aria-label="Editing view">
                  {['3d', '2d'].map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      title={mode === '3d' ? '3D model' : '2D mockup'} aria-pressed={viewMode === mode}
                      className={`px-2.5 h-8 sm:h-9 max-sm:portrait:h-9 rounded-md font-body text-[10px] tracking-[0.18em] uppercase transition-colors duration-150 ${
                        viewMode === mode ? 'bg-bone text-pine' : 'text-bone/70 hover:text-bone'
                      }`}>
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="w-px h-6 bg-bone/15 mx-1 sm:mx-1.5 shrink-0 max-sm:portrait:hidden" />

                {DOCK_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => togglePanel(id)} title={label} aria-label={label}
                    aria-pressed={activePanel === id}
                    className={`w-9 h-9 sm:w-10 sm:h-10 max-sm:portrait:w-10 max-sm:portrait:h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150 ${
                      activePanel === id ? 'bg-bone text-pine' : 'text-bone/70 hover:bg-bone/10 hover:text-bone'
                    }`}>
                    <Icon size={17} strokeWidth={1.5} />
                  </button>
                ))}

                <div className="w-px h-6 bg-bone/15 mx-1 sm:mx-1.5 shrink-0 max-sm:portrait:hidden" />

                <button onClick={toggleCollection} title="Collection" aria-label="Collection"
                  aria-pressed={showCollection}
                  className={`w-9 h-9 sm:w-10 sm:h-10 max-sm:portrait:w-10 max-sm:portrait:h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150 ${
                    showCollection ? 'bg-bone text-pine' : 'text-bone/70 hover:bg-bone/10 hover:text-bone'
                  }`}>
                  <BookmarkPlus size={17} strokeWidth={1.5} />
                </button>
              </div>

              <div className="w-px h-6 bg-bone/15 mx-1 sm:mx-1.5 shrink-0 max-sm:portrait:hidden" />

              <button onClick={handleQuoteClick} title="Request a Quote"
                className="flex items-center justify-center gap-1.5 h-9 sm:h-10 max-sm:portrait:h-11 pl-3.5 pr-3 sm:pl-4 sm:pr-3.5 rounded-lg btn-gradient text-bone font-body text-[11px] font-semibold tracking-[0.15em] uppercase whitespace-nowrap shrink-0">
                Get a Quote <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default AtelierPage
