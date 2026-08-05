// Shared helpers for the Atelier configurator's per-side design layers (uploaded images and
// text, independently placed on the front/back of the garment).

export const MIN_LAYER_OPACITY = 0.1

export const TEXT_FONTS = [
  { label: 'General Sans', value: "'General Sans', sans-serif" },
  { label: 'Reckless Neue', value: "'Reckless Neue', serif" },
]

export const MIN_LAYER_SIZE = 0.05
export const DESIGN_CANVAS_PX = 1024

/** The 8 resize-handle positions around a selected layer's box, as fractions of its own bounds. */
export const RESIZE_HANDLES = [
  { id: 'nw', dx: -1, dy: -1, cursor: 'nwse-resize' },
  { id: 'n', dx: 0, dy: -1, cursor: 'ns-resize' },
  { id: 'ne', dx: 1, dy: -1, cursor: 'nesw-resize' },
  { id: 'e', dx: 1, dy: 0, cursor: 'ew-resize' },
  { id: 'se', dx: 1, dy: 1, cursor: 'nwse-resize' },
  { id: 's', dx: 0, dy: 1, cursor: 'ns-resize' },
  { id: 'sw', dx: -1, dy: 1, cursor: 'nesw-resize' },
  { id: 'w', dx: -1, dy: 0, cursor: 'ew-resize' },
]

function newId() {
  return crypto.randomUUID()
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function createImageLayer(side, url, fileName, aspect) {
  const width = 0.42
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  return {
    id: newId(),
    type: 'image',
    side,
    x: 0.5,
    y: 0.5,
    width,
    height: clamp(width / safeAspect, MIN_LAYER_SIZE, 0.9),
    opacity: 1,
    url,
    fileName,
  }
}

export function createTextLayer(side) {
  return {
    id: newId(),
    type: 'text',
    side,
    x: 0.5,
    y: 0.5,
    width: 0.55,
    height: 0.14,
    opacity: 1,
    text: 'Your text',
    color: '#1B3A2B',
    fontFamily: TEXT_FONTS[0].value,
  }
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Draws every layer for one side, in array order (later = on top). Pass `target` to redraw
 * an existing canvas in place (keeps the GPU texture that wraps it from being reallocated
 * on every edit) — omit it to allocate a fresh one.
 */
export function composeDesignCanvas(layers, imageCache, target) {
  const canvas = target ?? document.createElement('canvas')
  canvas.width = DESIGN_CANVAS_PX
  canvas.height = DESIGN_CANVAS_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const size = DESIGN_CANVAS_PX
  for (const layer of layers) {
    const w = layer.width * size
    const h = layer.height * size
    const cx = layer.x * size
    const cy = layer.y * size

    if (layer.type === 'image') {
      const img = imageCache.get(layer.url)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save()
        ctx.globalAlpha = layer.opacity
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
        ctx.restore()
      }
      continue
    }

    ctx.save()
    ctx.globalAlpha = layer.opacity
    ctx.fillStyle = layer.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const label = layer.text || ' '
    const maxWidth = w * 0.94
    let fontSize = h * 0.7
    ctx.font = `600 ${fontSize}px ${layer.fontFamily}`
    while (fontSize > 4 && ctx.measureText(label).width > maxWidth) {
      fontSize -= 1
      ctx.font = `600 ${fontSize}px ${layer.fontFamily}`
    }
    ctx.fillText(label, cx, cy)
    ctx.restore()
  }

  return canvas
}
