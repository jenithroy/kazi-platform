import { LegalPageLayout } from "@/components/LegalPageLayout";

// DRAFT — written from what the codebase actually collects/stores (Supabase schema in
// supabase/migrations/, cart/quote-handoff localStorage usage, the six forms that take PII).
// This is a starting template, not legal advice. Before publishing, a solicitor needs to
// confirm/fix at least:
//   - Kazi Manufacturing's exact legal entity name and registered address (currently just
//     "Kathmandu, Nepal", matching the Footer — no registration number exists anywhere to cite).
//   - Whether Article 27 UK GDPR requires appointing a UK representative: Kazi is based outside
//     the UK/EEA and its core business is offering manufacturing/editing services to UK brands,
//     which is unlikely to qualify as "occasional" processing, so a representative is probably
//     required. None is named below — don't invent one.
//   - The Supabase project's hosting region (determines the international-transfer wording).
//   - The retention periods below (12/24/36 months) are reasonable defaults, not confirmed
//     business practice — check against actual data lifecycle before shipping.
//   - Whether Kazi needs to register with the ICO (likely yes, once UK representative is set).
const LAST_UPDATED = "22 August 2026";

const INTRO =
  "This policy explains what personal data Kazi Manufacturing collects through kazimanufacturing.com, why we collect it, and the rights you have over it. It applies to enquiries, accounts, and orders placed through this site.";

const SECTIONS = [
  {
    heading: "Who we are",
    body: [
      "Kazi Manufacturing (\"Kazi\", \"we\", \"us\") operates from Kathmandu, Nepal, and provides custom apparel manufacturing and video editing services to clothing brands, including brands based in the UK. For the purposes of UK data protection law, Kazi is the controller of the personal data described in this policy.",
      "Contact us about this policy or any privacy request at hello@kazimanufacturing.com.",
    ],
  },
  {
    heading: "What we collect",
    body: [
      "We collect different data depending on how you use the site:",
      {
        type: "list",
        items: [
          "Enquiry and quote data — name, email, phone, company name, garment details, quantities, deadlines and any project details or artwork files you submit through the Quote or Pricing forms.",
          "Account data — name, email, company name and phone number if you register for an account, plus your password (stored securely, never in plain text).",
          "Order and production data — order status, production notes and messages exchanged with our team once a quote becomes an order.",
          "Marketing preferences — your email address if you opt in to the newsletter, and whether you've opted in or out.",
          "Technical and security data — IP address and browser/device information, logged automatically against certain account actions for fraud prevention and security auditing.",
          "Shopping bag contents — stored only in your browser (not on our servers) so your bag persists between visits.",
        ],
      },
    ],
  },
  {
    heading: "How we use it, and our legal basis",
    body: [
      {
        type: "list",
        items: [
          "To respond to a quote or pricing enquiry and provide a proposal — necessary to take steps at your request before entering into a contract.",
          "To manage an order once you've accepted a quote, including production updates and messages — necessary to perform that contract.",
          "To create and manage your account — necessary to perform our contract with you.",
          "To send you marketing updates by email — only with your consent, given by ticking the newsletter checkbox. You can withdraw this at any time.",
          "To detect and prevent fraud, and to keep an audit trail of account activity — our legitimate interest in keeping the platform secure, balanced against your rights.",
          "To comply with legal obligations, such as responding to a lawful request from a regulator.",
        ],
      },
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "We use Supabase as our database, authentication and file storage provider, which processes personal data on our behalf under a data processing agreement. We do not sell your data, and we don't share it with advertisers or analytics companies — the site currently runs no analytics or advertising trackers of any kind.",
      "If you contact us via the WhatsApp button on the site, that conversation is handled through WhatsApp/Meta's own platform, under their privacy policy rather than ours.",
      "We may disclose data where required by law, or to protect our rights, safety or property, or that of our customers.",
    ],
  },
  {
    heading: "International transfers",
    body: [
      "Kazi operates from Nepal, and our infrastructure provider (Supabase) may process and store data outside the UK. Where personal data is transferred internationally, we rely on appropriate safeguards recognised under UK data protection law, such as the UK's International Data Transfer Agreement or an adequacy decision, as applicable to the specific transfer.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      {
        type: "list",
        items: [
          "Quote and pricing enquiries that don't turn into an order: up to 12 months from your last contact with us, then deleted or anonymised.",
          "Account, order and message data: for as long as your account is active, and up to 36 months after your last order for tax, accounting and warranty purposes.",
          "Marketing consent and email address: until you unsubscribe or ask us to delete it.",
          "Security and audit logs: up to 24 months, then deleted.",
        ],
      },
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Under UK GDPR, you have the right to access the personal data we hold about you, correct it, ask us to delete it, restrict or object to certain processing, and receive a copy in a portable format. Where processing relies on your consent (such as marketing emails), you can withdraw it at any time.",
      "To exercise any of these rights, email hello@kazimanufacturing.com. If you're not satisfied with how we've handled your request, you have the right to complain to the UK Information Commissioner's Office (ico.org.uk).",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "This site doesn't use tracking or advertising cookies. It uses your browser's local storage to keep your shopping bag between visits and to keep you signed in, which is necessary for the site to function. See our Cookie Policy for the full detail.",
    ],
  },
  {
    heading: "Children",
    body: [
      "This site is intended for businesses and individuals over 18 sourcing apparel manufacturing services. We don't knowingly collect data from children.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We'll update this page if how we handle personal data changes, and update the date at the top accordingly.",
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
