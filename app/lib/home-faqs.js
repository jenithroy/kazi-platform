// The homepage's FAQs. They live here, not in components/FaqSection.jsx: that file is a client component ("use client"), and a server
// component that imports a constant from one is handed a reference to it, not the array (app/page.js feeds these to the FAQ JSON-LD at build time).
export const HOME_FAQS = [
  {
    q: "What's your minimum order quantity?",
    a: "We take on small-batch runs starting from 100 units per style, so new and growing brands can order without over-committing to stock.",
  },
  {
    q: "Do you make samples before full production?",
    a: "Yes — every order goes through pattern, fabric and stitch samples first. Nothing is cut at scale until you've signed off on the final sample.",
  },
  {
    q: "How long does production take?",
    a: "Timelines depend on the style, quantity and finishes, but most orders move from approved sample to packed goods within a few weeks. We'll give you a firm date in your quote.",
  },
  {
    q: "Can you handle private label and custom branding?",
    a: "Yes. Woven or printed labels, custom packaging and branded tags are all part of what we set up during sampling, so goods arrive ready for your shelves.",
  },
  {
    q: "Where is production based?",
    a: "Everything is cut and sewn in our own facility in Kathmandu, Nepal, by the same core tailoring team from first sample to final shipment.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes, we ship worldwide. Shipping, customs and packaging are quoted separately from unit pricing so there are no surprises on your invoice.",
  },
];
