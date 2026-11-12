import { Reveal } from "@/components/Reveal";
import { CALLOUTS } from "./content";
import { CONTAINER, H2, H3, SMALL } from "./styles";

// The five things on a piece that carry the creator's name.
export function MakeItYours() {
  return (
    <section aria-labelledby="yours-title" className="bg-white py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 md:mb-16">
          <h2 id="yours-title" className={`${H2} max-w-[16ch]`}>
            Your label, inside and out.
          </h2>
        </Reveal>

        <ul className="m-0 grid list-none gap-x-8 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {CALLOUTS.map((callout, index) => (
            <Reveal as="li" key={callout.title} delay={index * 70} className="border-t border-pine/15 pt-5">
              <h3 className={H3}>{callout.title}</h3>
              <p className={`${SMALL} m-0 mt-2`}>{callout.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
