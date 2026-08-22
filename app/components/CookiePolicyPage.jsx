import { LegalPageLayout } from "@/components/LegalPageLayout";

// DRAFT — reflects an actual code audit (no analytics/advertising trackers found anywhere in
// the app), not a guess. If analytics, ads or any other third-party script are added later,
// this page and the consent approach both need revisiting — everything stored today is
// "strictly necessary", which is why there's no cookie-consent banner on the site.
const LAST_UPDATED = "22 August 2026";

const INTRO =
  "Kazi Manufacturing doesn't run analytics, advertising or tracking cookies. This page lists exactly what this site stores in your browser and why.";

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
    heading: "If this changes",
    body: [
      "If we add analytics or advertising in future, we'll add a consent banner before anything non-essential runs, and update this page to match. Nothing like that runs today.",
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
