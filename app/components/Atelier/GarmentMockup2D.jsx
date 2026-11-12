'use client'

import { useId } from 'react'
import { getGarment } from '@/lib/garments'

// A recolourable flat picture of a garment. Every garment's picture is the same kind of file: a
// greyscale shading map with an alpha silhouette (public/mockups, prepared by scripts/garments/shade.mjs).
// In it the fabric itself is exactly white, creases and shadows are darker, nothing is brighter than the
// fabric, and the edge is clean. So it is drawn in three steps:
//
//   1. the chosen colour, filled inside the picture's own alpha (never its brightness: using brightness
//      as the mask is what used to wash every colour out with white and leave a pale fringe);
//   2. an optional pattern over it, faded by patternOpacity, so the colour still tints the print;
//   3. the shading multiplied on top, so folds, seams and pockets read through any colour, and a flat
//      area is the swatch colour exactly;
//   4. a soft highlight map screened over that. Multiplying can only darken, so on a dark colour the folds,
//      seams and pockets would vanish; screen brings them back, and it does nothing to white or pale colours
//      (screen with anything is still white), so it cannot leave pale marks on them.
//
// A hairline outline and a soft shadow are part of the component (`lift`), so a white or pale garment
// keeps its edge wherever it is shown, on the Atelier stage, a product card or the quote page.
//
// `area` is the garment's own opaque bounding box within the image (shoulders/sleeves to hem) — not a
// small centred print zone. Artwork can be dragged and resized across this whole span; Garment2DEditor
// clips the rendered artwork to the garment's silhouette (via the same image used as a CSS mask), so
// anything pushed past the fabric edge is cut off rather than spilling onto the transparent background,
// matching how the 3D decal is naturally bounded by the mesh it's projected onto.

export function getImageMeta(garment, side) {
  const found = getGarment(garment) ?? getGarment('t-shirt')
  return found.mockups[side]
}

/** Printable area for a garment/side, as a fraction (0..1) of the mockup image's own bounds. */
export function getDesignArea(garment, side) {
  return getImageMeta(garment, side).area
}

// `lift="full"` (the default): outline and soft shadow, for a stage or a card. `lift="outline"`: the
// hairline only, for thumbnails where a 16px shadow would be clipped. `lift={false}`: neither.
const OUTLINE = 'drop-shadow(0 0 0.6px rgba(27, 58, 43, 0.6))'
const SHADOW = 'drop-shadow(0 10px 16px rgba(27, 58, 43, 0.2))'
const LIFT = { full: `${OUTLINE} ${SHADOW}`, outline: OUTLINE }

// How strongly the highlight map is screened over the colour (the map itself is already soft and capped).
const HIGHLIGHT = 0.55

export function GarmentMockup2D({
  garment,
  side,
  colour,
  pattern = null,
  patternOpacity = 1,
  lift = 'full',
}) {
  const uid = useId()
  const { src, light, width, height } = getImageMeta(garment, side)
  const maskId = `garment-mask-${uid}`
  const patternId = `garment-pattern-${uid}`
  const tileSize = width / 5

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ isolation: 'isolate', filter: lift ? LIFT[lift] : undefined }}
      aria-hidden
    >
      <defs>
        {/* The silhouette, from the picture's own alpha (not its brightness). */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} mask-type="alpha" style={{ maskType: 'alpha' }}>
          <image href={src} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />
        </mask>

        {pattern && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
            <image href={pattern} width={tileSize} height={tileSize} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>

      {/* 1. The fabric colour, clipped to the garment. A pattern fades in over it (below) rather than
          replacing it, so the chosen colour still tints the print. */}
      <rect x="0" y="0" width={width} height={height} fill={colour} mask={`url(#${maskId})`} />
      {pattern && (
        <rect x="0" y="0" width={width} height={height} fill={`url(#${patternId})`} mask={`url(#${maskId})`} style={{ opacity: patternOpacity }} />
      )}

      {/* 2. The shading, multiplied on top so folds, pockets and edges read through any colour. */}
      <image
        href={src} x="0" y="0" width={width} height={height}
        preserveAspectRatio="none"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* 3. The highlights, screened over the top: they keep folds and pockets visible on dark colours. */}
      {light && (
        <image
          href={light} x="0" y="0" width={width} height={height}
          preserveAspectRatio="none"
          style={{ mixBlendMode: 'screen', opacity: HIGHLIGHT }}
        />
      )}
    </svg>
  )
}
