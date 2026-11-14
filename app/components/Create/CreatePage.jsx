import Link from "next/link";
import CreateFlow from "@/components/Create/CreateFlow";

const STEPS = [
  {
    title: "Choose a garment",
    text: "A t-shirt, a hoodie or a pair of sweatpants, in any of twelve colours.",
  },
  {
    title: "Show us your logo",
    text: "Type your website or your Instagram name and we look for your logo there, or upload it yourself.",
  },
  {
    title: "Check it and order",
    text: "We turn the logo into an embroidery file and show it on the garment, to scale. Happy? Place the order and Kazi replies with the price.",
  },
];

const GOOD_TO_KNOW = [
  "A person at Kazi checks every order before anything is made, and nothing is paid until you have agreed the price.",
  "The logo has to be yours, or you must be allowed to use it on clothing. We may ask you to show that.",
  "From an Instagram name we take your public profile picture, which is only 150 pixels wide: fine for a simple flat logo, soft for anything detailed. Your website's logo, or a larger file you upload, gives cleaner stitches. A PNG with a clear background works best.",
  "Flat-colour logos stitch best. Lines thinner than a thread (about 0.4 mm) and photographs do not.",
];

export function CreatePage() {
  return (
    <div className="bg-paper">
      <section className="px-6 pb-8 pt-16 md:px-8 md:pb-10 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="max-w-3xl font-display text-3xl text-pine md:text-4xl">Your logo on a garment, in two clicks.</h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-pine-soft">
            Pick a garment, give us your website or Instagram name or upload your logo, and we turn it into an embroidery file and show it on the
            garment. Like what you see? Place the order.
          </p>
        </div>
      </section>

      <section aria-label="Create by design" className="px-6 pb-14 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[1440px]">
          <CreateFlow />
          <noscript>
            <p className="mt-4 rounded-sm border border-pine/15 bg-bone p-4 font-body text-sm text-pine-soft">
              Create by design runs in your browser, so it needs JavaScript switched on. You can also{" "}
              <Link href="/quote" className="text-pine underline underline-offset-2">request a quote</Link>.
            </p>
          </noscript>
        </div>
      </section>

      <section className="border-t border-pine/10 px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-display text-2xl text-pine md:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.title} className="rounded-sm border border-pine/15 bg-bone p-6">
                <h3 className="font-display text-xl text-pine md:text-2xl">{step.title}</h3>
                <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-pine-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pine/10 px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-display text-2xl text-pine md:text-3xl">Good to know</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {GOOD_TO_KNOW.map((text) => (
              <li key={text} className="rounded-sm border border-pine/15 bg-bone p-5 font-body text-[0.95rem] leading-relaxed text-pine-soft">
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-8 font-body text-sm text-pine-soft">
            Want to shape the stitching yourself? Use the free <Link href="/digitizer" className="text-pine underline underline-offset-2 hover:text-moss-deep">embroidery digitizer</Link>.
            Making more than one design, or something that is not a garment on this page?{" "}
            <Link href="/quote" className="text-pine underline underline-offset-2 hover:text-moss-deep">Request a quote</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
