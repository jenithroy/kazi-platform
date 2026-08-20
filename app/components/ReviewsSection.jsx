import { Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ScrollVelocity } from "@/components/ScrollVelocity";

// Placeholder reviews — swap for real client quotes before launch.
const ROW_ONE = [
  {
    name: "Eleanor Hargrove",
    role: "Founder, Marlow & Co.",
    rating: 5,
    quote:
      "Kazi took our first collection from sketch to shelf without a single missed deadline. The sample rounds alone saved us from three costly mistakes.",
  },
  {
    name: "Daniel Osei",
    role: "Head of Production, Fenwick Studio",
    rating: 5,
    quote:
      "Communication was constant and honest — if a fabric wasn't going to hold up, they told us before we cut, not after.",
  },
  {
    name: "Priya Nair",
    role: "Founder, Norr Studio",
    rating: 4,
    quote:
      "Small-batch runs that actually feel like they get the same care as a large order. Our knitwear line has never fit better.",
  },
  {
    name: "Thomas Reilly",
    role: "Buyer, Holloway & Finch",
    rating: 5,
    quote:
      "We've worked with three other manufacturers before Kazi. None of them caught construction issues at the sample stage the way this team does.",
  },
];

const ROW_TWO = [
  {
    name: "Amara Whitfield",
    role: "Creative Director, Birch Supply Co.",
    rating: 5,
    quote:
      "Private label packaging arrived exactly to spec, down to the stitching on the woven tags. That level of finish sold the whole line for us.",
  },
  {
    name: "Callum Bryce",
    role: "Founder, Ridgeline Outerwear",
    rating: 5,
    quote:
      "Our outerwear needed a factory that understood technical fabrics, not just cotton basics. Kazi's team asked better questions than we did.",
  },
  {
    name: "Sofia Mendez",
    role: "Operations Lead, Aldergate Denim",
    rating: 4,
    quote:
      "Shipping timelines were realistic from the first quote and held up through a 10,000-unit order. No surprises on the invoice either.",
  },
  {
    name: "Jonas Ferreira",
    role: "Founder, Vale & Loom",
    rating: 5,
    quote:
      "Started with a 500-unit trial run to test the relationship. Two years later they're still our only manufacturing partner.",
  },
];

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={15}
          strokeWidth={1.5}
          className={i < rating ? "fill-moss text-moss" : "fill-transparent text-pine/20"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ name, role, rating, quote }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col gap-5 rounded-sm border border-pine/8 bg-paper-raised p-6 sm:w-[360px]">
      <Stars rating={rating} />
      <p className="m-0 flex-1 font-body text-sm leading-relaxed text-pine-soft">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3 border-t border-pine/8 pt-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/8 font-body text-xs font-semibold text-pine"
        >
          {initials}
        </span>
        <div className="flex flex-col">
          <span className="font-body text-sm font-semibold text-pine">{name}</span>
          <span className="font-body text-xs text-pine-soft/70">{role}</span>
        </div>
      </div>
    </div>
  );
}

const EDGE_FADE_STYLE = {
  maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
  WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
};

export function ReviewsSection() {
  return (
    <section id="reviews" className="overflow-hidden bg-white py-20 md:py-28">
      <Reveal className="mx-auto mb-14 max-w-[760px] px-6 text-center md:mb-20">
        <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">Reviews</span>
        <h2 className="m-0 font-display text-3xl leading-[1.2] text-pine md:text-4xl lg:text-[2.75rem]">
          What brands say about working with us.
        </h2>
      </Reveal>

      <Reveal delay={100} className="flex flex-col gap-6">
        <ScrollVelocity
          texts={[
            <div key="row-1" className="flex items-stretch gap-6">
              {ROW_ONE.map((review) => (
                <ReviewCard key={review.name} {...review} />
              ))}
            </div>,
            <div key="row-2" className="flex items-stretch gap-6">
              {ROW_TWO.map((review) => (
                <ReviewCard key={review.name} {...review} />
              ))}
            </div>,
          ]}
          velocity={28}
          numCopies={3}
          scrollerClassName="flex w-max items-stretch gap-6 py-1 will-change-transform"
          parallaxClassName="relative overflow-hidden"
          parallaxStyle={EDGE_FADE_STYLE}
        />
      </Reveal>
    </section>
  );
}
