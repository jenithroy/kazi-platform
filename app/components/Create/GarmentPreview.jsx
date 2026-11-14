"use client";

import { GarmentMockup2D } from "@/components/Atelier/GarmentMockup2D";
import { stageBackground } from "@/lib/garments";
import { createGarment, logoBox, mockupOf } from "./config";

// The garment (the Atelier's own recolourable mockup) with the stitched logo on it at its real size.
//
// The mockup picture has a lot of empty margin (the tee fills half of its width), so a stage shows only the garment's own design area
// (`area`, as fractions of the picture) and everything is positioned in the picture's coordinates inside a box that is moved and scaled to
// put that area in the stage (`AreaStage`). The logo is the picture of the thread (lib/digitizer/oneClick.js threadCanvas) drawn at its real
// width on a garment whose picture scale is known (config.js mmPerPx), clipped to the garment's silhouette like the Atelier's artwork.
//
// With no logo yet there is a dashed box where it will go, so the page is not an empty silhouette.

/** A box showing a garment's design area, `pad` percent of air all round, no taller than `maxHeight` px; the children are placed in the picture's own fractions. */
function AreaStage({ garmentId, colour, pad = 4, maxHeight = 560, lift = "full", background, className = "", children, ...rest }) {
  const meta = mockupOf(garmentId);
  const { area } = meta;
  const aspect = (area.width * meta.width) / (area.height * meta.height); // the area's width over its height, on screen
  const use = 100 - 2 * pad;
  return (
    <div
      className={`relative mx-auto overflow-hidden ${className}`}
      style={{ aspectRatio: String(aspect), width: `min(100%, ${(maxHeight * aspect).toFixed(1)}px)`, background }}
      {...rest}
    >
      <div
        className="absolute"
        style={{
          left: `${(-area.x / area.width) * use + pad}%`,
          top: `${(-area.y / area.height) * use + pad}%`,
          width: `${use / area.width}%`,
          height: `${use / area.height}%`,
        }}
      >
        <div className="absolute inset-0">
          <GarmentMockup2D garment={garmentId} side="front" colour={colour} lift={lift} />
        </div>
        {children}
      </div>
    </div>
  );
}

/** A small recolourable picture of a garment, for the picker. */
export function GarmentThumb({ garmentId, colour, height = 76 }) {
  return <AreaStage garmentId={garmentId} colour={colour} pad={0} maxHeight={height} lift="outline" aria-hidden="true" />;
}

export function GarmentPreview({ garmentId, colour, overlay = null, working = false, label }) {
  const g = createGarment(garmentId);
  const meta = mockupOf(garmentId);
  const widthMm = overlay?.widthMm ?? g.stitchWidthMm;
  const box = logoBox(garmentId, widthMm);
  // the logo's box in picture fractions: its width from the real size, its height from the thread picture's own proportions
  const logoW = box.width;
  const logoH = overlay ? (logoW * meta.width) / (overlay.aspect * meta.height) : (logoW * meta.width) / meta.height;

  const mask = {
    WebkitMaskImage: `url(${meta.src})`,
    maskImage: `url(${meta.src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <AreaStage
      garmentId={garmentId}
      colour={colour}
      role="img"
      aria-label={label}
      className="rounded-sm border border-pine/15 transition-[background-color] duration-300"
      background={stageBackground(colour)}
    >
      <div className="absolute inset-0" style={mask}>
        {overlay ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL made in this page, next/image cannot optimise it
          <img
            src={overlay.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${logoW * 100}%`, height: `${logoH * 100}%`, transform: "translate(-50%, -50%)", filter: "drop-shadow(0 0.5px 0.6px rgba(0,0,0,0.4))" }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute rounded-xs border border-dashed"
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${logoW * 100}%`,
              height: `${logoH * 100}%`,
              transform: "translate(-50%, -50%)",
              borderColor: "rgba(27,58,43,0.45)",
              background: "rgba(255,255,255,0.18)",
            }}
          />
        )}
      </div>
      {working && <div aria-hidden="true" className="absolute inset-0 bg-bone/45 motion-safe:animate-pulse" />}
    </AreaStage>
  );
}
