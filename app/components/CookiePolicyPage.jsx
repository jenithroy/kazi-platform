import { LegalPageLayout } from "@/components/LegalPageLayout";

// DRAFT — reflects an actual code audit (no analytics/advertising trackers found anywhere in
// the app), not a guess. Everything stored today is "strictly necessary" and wouldn't legally
// require a banner on its own — the banner exists ahead of that, so a future analytics/ads
// addition just has to check the stored choice instead of also shipping new consent UI. If
// analytics, ads or any other third-party script are added later, this page needs revisiting.
const LAST_UPDATED = "23 August 2026";

const INTRO =
  "Kazi Manufacturing doesn't run analytics, advertising or tracking cookies. This page lists exactly what this site stores in your browser and why, and what the cookie banner's choice does.";

const SECTIONS = [
  {
    heading: "What we store, and why",
    body: [
      {
        type: "list",
        items: [
          "Sign-in session — set when you log in, so you stay signed in as you move around the site. Strictly necessary; removed when you log out or your session expires.",
          "Shopping bag — the items you've added, so your bag survives a page refresh or a return visit. Strictly necessary for the bag feature to work; stored only in your browser, never sent to our analytics (we have none).",
          "Atelier design handoff — when you move from designing a garment in the Atelier to the quote form, your in-progress design is held briefly in your browser so it carries across. Cleared automatically once used.",
          "Cookie banner choice — whether you picked \"Accept All\" or \"Necessary Only\" on the cookie banner, so we don't ask again on your next visit. Strictly necessary for the banner itself to work.",
        ],
      },
      "None of this requires your consent under UK PECR, because it's all necessary for features you've actively chosen to use — none of it is used to track you across sites or build an advertising profile.",
    ],
  },
  {
    heading: "Third-party requests",
    body: [
      "Pages on this site load a webfont from Fontshare (api.fontshare.com), which means your browser makes a direct request to Fontshare's servers to fetch that font. Fontshare may see your IP address as part of serving that request, under their own privacy policy — we don't control this and don't receive any data from it.",
    ],
  },
  {
    heading: "The cookie banner",
    body: [
      "You'll see a banner on your first visit asking you to accept all cookies or continue with necessary-only. Right now both choices behave identically, because nothing non-essential runs on this site yet — the banner exists ahead of that so we're ready to honour your choice the moment analytics or advertising cookies are added, rather than asking again later. We'll update this page to describe those cookies specifically if and when that happens.",
    ],
  },
  {
    heading: "Questions",
    body: ["Email hello@kazimanufacturing.com if you have questions about this page."],
  },
];

export function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
