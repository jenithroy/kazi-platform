'use client'

import { useId } from 'react'
import { getGarment } from '@/lib/garments'

// A recolourable flat picture of a garment, in two flavours (the garment list in lib/garments.js
// says which each picture is):
//
//  - "photo": real flat-lay photography of a white garment (the tee and hoodie), recoloured live via
//    an SVG mask + a multiply blend of the chosen colour — same technique real print-on-demand
//    configurators use, so the fabric's actual folds/shading carry through regardless of colour.
//  - "render": a studio render of a generated model (everything else). Its shading is already
//    normalised, so it is simply multiplied over a fill of the chosen colour.
//
// `area` is the garment's own opaque bounding box within the image (shoulders/sleeves to
// hem) — not a small centred print zone. Artwork can be dragged and resized across this
// whole span; Garment2DEditor clips the rendered artwork to the garment's silhouette (via
// the same image used as a CSS mask), so anything pushed past the fabric edge is cut off
// rather than spilling onto the transparent background, matching how the 3D decal is
// naturally bounded by the mesh it's projected onto.

export function getImageMeta(garment, side) {
  const found = getGarment(garment) ?? getGarment('t-shirt')
  return found.mockups[side]
}

/** Printable area for a garment/side, as a fraction (0..1) of the mockup image's own bounds. */
export function getDesignArea(garment, side) {
  return getImageMeta(garment, side).area
}

export function GarmentMockup2D({
  garment,
  side,
  colour,
  pattern = null,
  patternOpacity = 1,
}) {
  const uid = useId()
  const { src, width, height, kind } = getImageMeta(garment, side)
  const maskId = `garment-mask-${uid}`
  const patternId = `garment-pattern-${uid}`
  const tileSize = width / 5

  if (kind === 'render') {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ isolation: 'isolate' }} aria-hidden>
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

        {/* 1. The fabric colour, clipped to the garment. A pattern fades in over it (below) rather
            than replacing it, so the chosen colour still tints the print. */}
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
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-hidden>
      <defs>
        {/* Recolor mask, driven by the mockup photo's own alpha/luminance. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <image href={src} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />
        </mask>

        {pattern && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
            <image href={pattern} width={tileSize} height={tileSize} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>

      {/* 1. Neutral grayscale base — clean start regardless of the source photo's cast. The
          source photography is a white garment, so its flat fabric area only spans roughly
          the 205–240/255 luminance band (measured), not true white — multiplying the chosen
          colour by that dimmer base is what left colours looking washed out/whitish. This
          contrast curve clips that entire flat-fabric band to true white (so multiply
          reproduces the picked colour exactly, with zero tint from the mockup's own white),
          leaving only the genuinely deep creases/shadows (well below the fabric band) visible. */}
      <image
        href={src} x="0" y="0" width={width} height={height}
        preserveAspectRatio="none"
        style={{ filter: 'grayscale(1) contrast(2.4) brightness(1.1)' }}
      />

      {/* 2. Colour, masked to the garment silhouette and multiplied over the shading so fabric
          folds still read through. Always present — a pattern fades in *on top* of this
          (below) rather than replacing it, so the chosen colour still shows through/tints
          the print instead of the pattern sitting on a bare, uncoloured mockup. */}
      <rect x="0" y="0" width={width} height={height} fill={colour} mask={`url(#${maskId})`} style={{ mixBlendMode: 'multiply' }} />

      {/* 2b. Tiled pattern, same mask/blend, faded by patternOpacity so it blends into the
          colour fill above instead of overriding it outright. */}
      {pattern && (
        <rect x="0" y="0" width={width} height={height} fill={`url(#${patternId})`} mask={`url(#${maskId})`} style={{ mixBlendMode: 'multiply', opacity: patternOpacity }} />
      )}

      {/* No highlight-sheen layer: the source photo's fabric is almost uniformly bright to
          begin with, so a screen-blended "highlight" layer read as near-white across nearly
          the whole garment (not just true highlights) — at any real opacity it just re-tinted
          every colour toward white, the exact effect layer 1 above exists to remove. */}
    </svg>
  )
}
