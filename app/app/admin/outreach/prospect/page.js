import { Suspense } from "react";
import { ProspectDetail } from "@/components/admin/outreach/ProspectDetail";

export const metadata = { title: "Prospect" };

// The prospect id travels as ?id= — a static export can't pre-generate a page per prospect.
export default function ProspectRoute() {
  return (
    <Suspense fallback={null}>
      <ProspectDetail />
    </Suspense>
  );
}
