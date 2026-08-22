import { Reveal } from "@/components/Reveal";

// `scale` corrects for how much of each SVG's own canvas its mark actually fills — bold
// wordmarks (Wise, Aramex, Pond's, Samsung) read big even inside a modest box, while fine-lined
// or heavily-padded marks (Nude, Signature, Sunsilk) need a boost to carry equal visual weight
// in the row. Tuned by eye against the rendered strip, not derived from the SVGs' viewBoxes.
const BRANDS = [
  { name: "Wise", file: "wise.svg", scale: 0.85 },
  { name: "Dove", file: "dove.svg", scale: 1 },
  { name: "Nude", file: "nude.svg", scale: 1.4 },
  { name: "Aramex", file: "aramex.svg", scale: 0.85 },
  { name: "Happydent", file: "happydent.svg", scale: 0.9 },
  { name: "Pond's", file: "ponds.svg", scale: 0.8 },
  { name: "Signature", file: "signature.svg", scale: 1.5 },
  { name: "PUBG Mobile", file: "pubg-mobile.svg", scale: 1.05 },
  { name: "Sunsilk", file: "sunsilk.svg", scale: 1.3 },
  { name: "Samsung", file: "samsung.svg", scale: 0.85 },
];

function BrandLogo({ name, file, scale }) {
  return (
    <div
      role="img"
      aria-label={name}
      className="h-9 w-28 shrink-0 bg-bone opacity-70 transition-opacity duration-200 hover:opacity-100 md:h-11 md:w-36"
      style={{
        maskImage: `url(/logos/${file})`,
        WebkitMaskImage: `url(/logos/${file})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        transform: `scale(${scale})`,
      }}
    />
  );
}

export function BrandsSection() {
  return (
    <section id="brands" data-nav-theme="dark" className="bg-pine px-6 py-20 md:px-8 md:py-24">
      <div className="mx-auto w-full max-w-[1100px]">
        <Reveal
          as="h2"
          className="m-0 text-center font-body text-xs uppercase tracking-[0.18em] text-bone/70"
        >
          Brands We Have Worked With
        </Reveal>
        <Reveal
          delay={100}
          className="mt-12 grid grid-cols-2 items-center justify-items-center gap-x-10 gap-y-10 sm:grid-cols-3 md:mt-14 md:grid-cols-5 md:gap-x-12 md:gap-y-12"
        >
          {BRANDS.map((brand) => (
            <BrandLogo key={brand.file} {...brand} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
