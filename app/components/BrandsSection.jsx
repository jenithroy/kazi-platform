import { Reveal } from "@/components/Reveal";

const BRANDS = [
  { name: "Wise", file: "wise.svg" },
  { name: "Dove", file: "dove.svg" },
  { name: "Nude", file: "nude.svg" },
  { name: "Aramex", file: "aramex.svg" },
  { name: "Happydent", file: "happydent.svg" },
  { name: "Pond's", file: "ponds.svg" },
  { name: "Signature", file: "signature.svg" },
  { name: "PUBG Mobile", file: "pubg-mobile.svg" },
  { name: "Sunsilk", file: "sunsilk.svg" },
  { name: "Samsung", file: "samsung.svg" },
];

function BrandLogo({ name, file }) {
  return (
    <div
      role="img"
      aria-label={name}
      className="h-8 w-24 shrink-0 bg-[#27B771] sm:h-9 sm:w-28 md:h-10 md:w-32"
      style={{
        maskImage: `url(/logos/${file})`,
        WebkitMaskImage: `url(/logos/${file})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export function BrandsSection() {
  return (
    <section
      id="brands"
      data-nav-theme="dark"
      className="flex min-h-screen items-center bg-pine px-6 py-20 md:py-28"
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <Reveal
          as="h2"
          className="m-0 text-center font-display text-3xl text-bone md:text-4xl"
        >
          Brands We Have Worked With
        </Reveal>
        <Reveal
          delay={100}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-14 gap-y-10 md:mt-16 md:gap-x-16 md:gap-y-12"
        >
          {BRANDS.map((brand) => (
            <BrandLogo key={brand.file} {...brand} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
