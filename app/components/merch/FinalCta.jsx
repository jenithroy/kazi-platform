import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { SITE_PHONE_DIGITS } from "@/lib/site";
import { FORM_ID, WHATSAPP_MESSAGE } from "./content";
import { DropForm } from "./DropForm";
import { BODY, BUTTON_SECONDARY, CONTAINER, H2, TILE } from "./styles";

const WHATSAPP_URL = `https://wa.me/${SITE_PHONE_DIGITS}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

// The closing call to action, laid out like the home page's quote section
// (components/QuoteRequestSection.jsx): the heading on the left, the form in a card on the right.
export function FinalCta() {
  return (
    <section id={FORM_ID} aria-labelledby="drop-form-title" className="bg-paper py-20 lg:py-28">
      <div className={`${CONTAINER} grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16`}>
        <Reveal className="max-w-md lg:sticky" style={{ top: "calc(var(--nav-height) + 2rem)" }}>
          <h2 id="drop-form-title" className={H2}>
            Your drop starts here.
          </h2>
          <p className={`${BODY} m-0 mt-5`}>Tell us who you are and what you want to make. We reply within 24 hours.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`${BUTTON_SECONDARY} mt-7`}>
            <WhatsappLogo size={20} weight="fill" aria-hidden="true" />
            Chat on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Reveal>

        <Reveal delay={100} className={`border border-pine/8 bg-paper-raised p-6 sm:p-10 ${TILE}`}>
          <DropForm />
        </Reveal>
      </div>
    </section>
  );
}
