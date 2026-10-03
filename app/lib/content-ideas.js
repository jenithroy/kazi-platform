// Starter topics for the blog, aimed at what UK founders search for while looking for a
// manufacturer. Each starts a draft with the title, focus keyword and an outline of ## headings.
// Validate keywords against real search data (Search Console, Google Keyword Planner) before
// committing to a topic.
export const CONTENT_IDEAS = [
  {
    title: "How to find a clothing manufacturer for a small UK brand",
    keyword: "clothing manufacturer for small brands",
    category: "Guides",
    intent: "Founders comparing manufacturers — high intent, and the page most likely to win quotes.",
    outline: [
      "What to look for in a manufacturer",
      "Questions to ask before you commit",
      "Red flags in quotes and samples",
      "Why small brands manufacture in Nepal",
    ],
  },
  {
    title: "Low MOQ clothing manufacturing: what 50 units really costs",
    keyword: "low MOQ clothing manufacturer",
    category: "Pricing",
    intent: "Searchers who know they need small runs — Kazi's 50-unit minimum is the differentiator.",
    outline: ["What MOQ means and why factories set one", "A cost breakdown for a 50-unit run", "How price per unit falls as quantity rises", "When a small run makes sense"],
  },
  {
    title: "The tech pack checklist: what your manufacturer needs before sampling",
    keyword: "tech pack checklist",
    category: "Process",
    intent: "Early-stage founders preparing designs — builds trust before they're ready to buy.",
    outline: ["Measurements and grading", "Fabric, trims and colour references", "Construction and stitching details", "Labels, packaging and artwork files"],
  },
  {
    title: "How long does garment sampling take?",
    keyword: "garment sampling process",
    category: "Process",
    intent: "Answers a question asked on almost every quote call.",
    outline: ["The stages of sampling", "Typical timelines, step by step", "What slows sampling down", "Approving a sample for bulk production"],
  },
  {
    title: "DTG vs screen printing vs DTF: choosing a print method for your run",
    keyword: "DTG vs screen printing",
    category: "Printing",
    intent: "Comparison searches with steady volume; links naturally to the print services.",
    outline: ["How each method works", "Cost by quantity and number of colours", "Durability and feel", "Which to choose for your order"],
  },
  {
    title: "Embroidery or print? Choosing a decoration for branded apparel",
    keyword: "embroidery vs screen printing",
    category: "Printing",
    intent: "Brands deciding how to apply their logo — leads to an add-on in the quote.",
    outline: ["Where embroidery works best", "Where print works best", "Cost and minimums compared", "Care and longevity"],
  },
  {
    title: "Fabric weight (GSM) explained for t-shirts and hoodies",
    keyword: "GSM fabric weight",
    category: "Materials",
    intent: "Evergreen explainer that earns links and answers spec questions before the call.",
    outline: ["What GSM measures", "Typical weights for tees, sweats and hoodies", "How weight changes feel, drape and price", "Choosing a weight for your range"],
  },
  {
    title: "Private label hoodies: from blank to finished product",
    keyword: "private label hoodie manufacturer",
    category: "Guides",
    intent: "Product-specific, commercial intent — mirrors the hoodie pricing tiers.",
    outline: ["Choosing fabric and fit", "Branding options: labels, prints and embroidery", "Packaging and finishing", "Timelines and minimums"],
  },
  {
    title: "Manufacturing clothing in Nepal: lead times, shipping and duties to the UK",
    keyword: "clothing manufacturer Nepal",
    category: "Sourcing",
    intent: "Addresses the main doubt a UK brand has about an overseas factory.",
    outline: ["Why brands manufacture in Nepal", "Production lead times", "Shipping options to the UK", "Import duties and paperwork"],
  },
  {
    title: "Case study: from tech pack to finished run",
    keyword: "clothing production case study",
    category: "Case studies",
    intent: "Proof. Real projects (with the brand's permission) convert better than any guide.",
    outline: ["The brief", "Sampling and changes", "Production and quality control", "The result"],
  },
];

/** Starter Markdown for an idea: the outline as sections, plus the closing call to action. */
export function ideaDraftContent(idea) {
  const sections = idea.outline.map((heading) => `## ${heading}\n\n_Write this section._\n`);
  return [
    "_Open with the question your reader is asking, and answer it in the first two sentences._\n",
    ...sections,
    "## Work with Kazi\n\nTell us what you're making and we'll reply within 24 hours with an itemised quote. [Request a quote](/quote).\n",
  ].join("\n");
}
