"use client";

import dynamic from "next/dynamic";
// The stylesheet is imported here, not only in the editor, so it arrives with the page and the loading panel below is
// already drawn in its final size when the (much bigger) editor code follows.
import "./digitizer.css";

// The editor reads localStorage and the window while it starts and talks to Web Workers, so it is only ever built in the
// browser: the page itself (heading, explanation, links) is still plain HTML for search engines and readers without scripts.
const DigitizerEditor = dynamic(() => import("./DigitizerEditor"), {
  ssr: false,
  loading: () => (
    <div className="dz-skeleton" role="status">
      Loading the digitizer…
    </div>
  ),
});

export default function DigitizerClient() {
  return <DigitizerEditor />;
}
