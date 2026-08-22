import { LegalPageLayout } from "@/components/LegalPageLayout";

// Not part of the original three-page ask, added alongside the accessibility fixes since it's
// the honest, low-risk complement to them: states the real target (WCAG 2.1 AA) and gives
// people a way to report problems, without claiming a formal audit or certification that
// hasn't happened.
const LAST_UPDATED = "22 August 2026";

const INTRO =
  "We want kazimanufacturing.com to work for everyone, including people using a screen reader, keyboard-only navigation, or browser zoom.";

const SECTIONS = [
  {
    heading: "Our target",
    body: [
      "We're building this site to meet WCAG 2.1 Level AA where practical — things like keyboard access, screen-reader-friendly forms, sufficient colour contrast, and reduced motion for people who prefer it. This is an ongoing effort rather than a completed, independently audited certification.",
    ],
  },
  {
    heading: "What we've done",
    body: [
      {
        type: "list",
        items: [
          "A skip-to-content link for keyboard and screen-reader users.",
          "Form fields with visible labels and errors that are announced to assistive technology.",
          "Keyboard-operable navigation and shopping bag, including closing menus and dialogs with Escape.",
          "Motion that respects your operating system's \"reduce motion\" setting.",
        ],
      },
    ],
  },
  {
    heading: "Known limitations",
    body: [
      "The Atelier design tool is a visual, drag-and-drop canvas and isn't fully usable with a screen reader today. If you need to design a garment and this is a barrier, contact us and we'll work through it with you directly.",
    ],
  },
  {
    heading: "Tell us about a problem",
    body: [
      "If you hit an accessibility barrier anywhere on this site, email hello@kazimanufacturing.com with the page and what happened, and we'll look into it.",
    ],
  },
];

export function AccessibilityStatementPage() {
  return (
    <LegalPageLayout
      title="Accessibility Statement"
      lastUpdated={LAST_UPDATED}
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
