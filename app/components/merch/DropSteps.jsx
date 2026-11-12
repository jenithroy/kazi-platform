import { Reveal } from "@/components/Reveal";
import { STEPS } from "./content";
import { CONTAINER } from "./styles";

// The five steps of a drop on the site's pine green. data-nav-theme tells the main nav
// (components/Nav.jsx) to switch to its light-on-dark look while this section is under it.
export function DropSteps() {
  return (
    <section id="how-it-works" aria-labelledby="steps-title" data-nav-theme="dark" className="bg-pine py-24 text-bone md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 md:mb-16">
          <h2
            id="steps-title"
            className="m-0 text-balance font-display text-[clamp(2.125rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em]"
          >
            How a drop works.
          </h2>
        </Reveal>

        <ol className="m-0 grid list-none gap-x-8 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 70} className="border-t border-bone/20 pt-5">
              <span aria-hidden="true" className="font-display text-[2.5rem] leading-none text-bone/60">
                {index + 1}
              </span>
              <h3 className="m-0 mt-3 font-display text-[1.75rem] font-normal leading-[1.1] tracking-[-0.01em]">{step.title}</h3>
              <p className="m-0 mt-2 font-body text-[1.0625rem] leading-snug text-bone/80">{step.text}</p>
            </Reveal>
          ))}
        </ol>

        <p className="m-0 mt-12 max-w-[40rem] font-display text-[1.5rem] italic leading-snug md:mt-16 md:text-[1.875rem]">
          Every quote comes with a firm date, so you can announce your drop with confidence.
        </p>
      </div>
    </section>
  );
}
