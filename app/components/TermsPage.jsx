import { LegalPageLayout } from "@/components/LegalPageLayout";

// DRAFT — covers website-use terms only (the part I can write without inventing commercial
// facts). It deliberately does NOT set out manufacturing contract terms — payment schedule,
// cancellation/refund policy, IP ownership of designs, delivery/Incoterms, warranty and
// liability caps — because those are real commercial decisions Kazi needs to make, not
// something to guess at here. Section "Manufacturing and editing orders" below flags this and
// points to a quote-specific agreement instead of inventing numbers. Needs a solicitor pass
// before publishing, especially on liability and consumer-rights language for UK customers.
const LAST_UPDATED = "22 August 2026";

const INTRO =
  "These terms govern your use of kazimanufacturing.com. Placing an order for manufacturing or editing services is governed by the quote you accept, not by these website terms.";

const SECTIONS = [
  {
    heading: "Using this site",
    body: [
      "You may browse this site, request quotes, and use the Atelier design tool for your own business purposes. You agree not to misuse the site — including attempting to access accounts that aren't yours, uploading unlawful or infringing content through the Quote or Atelier tools, or interfering with the site's normal operation.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "If you create an account, you're responsible for keeping your login details confidential and for activity that happens under your account. Tell us straight away if you think your account has been accessed without permission.",
    ],
  },
  {
    heading: "Content and intellectual property",
    body: [
      "The site's own content — text, design, photography and the Atelier tool — belongs to Kazi Manufacturing or our licensors. You keep ownership of any artwork, logos or designs you upload to request a quote; uploading them gives us permission to use them only to prepare your quote and, if you go ahead, to produce your order.",
    ],
  },
  {
    heading: "Manufacturing and editing orders",
    body: [
      "Requesting a quote through this site doesn't create a contract. A contract is formed when you accept a specific quote from us, at which point the terms of that quote — price, minimum order quantity, lead time, revisions and payment — govern the order.",
    ],
  },
  {
    heading: "No warranty on the site itself",
    body: [
      "We try to keep this site accurate and available, but it's provided as-is, without a guarantee that it will be uninterrupted or error-free. Nothing here limits your statutory rights as a consumer under UK law.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms as the site changes. Continuing to use the site after an update means you accept the revised terms.",
    ],
  },
  {
    heading: "Contact",
    body: ["Questions about these terms: hello@kazimanufacturing.com."],
  },
];

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
