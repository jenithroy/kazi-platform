import {
  BaseballCap,
  CoatHanger,
  Dress,
  Handbag,
  Hoodie,
  Needle,
  Package,
  Palette,
  Pants,
  Ruler,
  Scissors,
  Sneaker,
  Stamp,
  Tag,
  TShirt,
  Yarn,
} from "@phosphor-icons/react/dist/ssr";

// A drifting row of round garment/tool chips (layout reference: the Antigravity homepage). It sits
// between the video panel and the range grid and is purely decorative. Sixteen chips, repeated
// twice in the track, with a sine-wave offset whose period divides sixteen — so when the track has
// moved one copy the pattern lines up again and the loop restarts invisibly.
const CHIPS = [
  TShirt, Scissors, Hoodie, Ruler, BaseballCap, Needle, Pants, Tag,
  Handbag, Yarn, Sneaker, Stamp, CoatHanger, Package, Dress, Palette,
];

const WAVE_PX = 26;

function Chip({ Icon, index }) {
  const lift = Math.round(Math.sin((index / CHIPS.length) * Math.PI * 4) * WAVE_PX);
  return (
    <li
      className="grid size-24 shrink-0 place-items-center rounded-full bg-pine/[0.05] text-pine"
      style={{ transform: `translateY(${lift}px)` }}
    >
      <Icon size={34} weight="light" />
    </li>
  );
}

const EDGE_FADE = "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)";

export function ChipsStatement() {
  return (
    <section className="overflow-hidden bg-paper pb-4 pt-20 md:pb-8 md:pt-28">
      {/* Decorative: it carries no content. */}
      <div
        aria-hidden="true"
        className="py-8"
        style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
      >
        <ul className="m-0 flex w-max list-none gap-6 p-0 pr-6 motion-safe:animate-marquee">
          {[0, 1].map((copy) =>
            CHIPS.map((Icon, i) => <Chip key={`${copy}-${i}`} Icon={Icon} index={i} />),
          )}
        </ul>
      </div>
    </section>
  );
}
