import DigitizerClient from "@/components/Digitizer/DigitizerClient";

/**
 * The digitizer is a full-screen workspace, like the Atelier: the editor is the page. Its tools and options float over the canvas
 * (DigitizerEditor.jsx), and there is no footer (SiteChrome.jsx).
 *
 * The only text outside the editor is the page's one heading, for screen readers and search engines, and what is shown when scripts
 * are off. The description, the structured data and the explanation of the three steps are in the metadata, the JSON-LD
 * (app/digitizer/page.js) and the first-run card on the canvas.
 */
export function DigitizerPage() {
  return (
    <>
      <h1 className="sr-only">Turn a logo into a machine embroidery file.</h1>
      <DigitizerClient />
      <noscript>
        <p className="m-6 rounded-sm border border-pine/15 bg-bone p-4 font-body text-sm text-pine-soft">
          The digitizer runs in your browser, so it needs JavaScript switched on.
        </p>
      </noscript>
    </>
  );
}
