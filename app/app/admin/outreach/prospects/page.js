import { Suspense } from "react";
import { ProspectsList } from "@/components/admin/outreach/ProspectsList";

export const metadata = { title: "Prospects" };

export default function ProspectsRoute() {
  return (
    <Suspense fallback={null}>
      <ProspectsList />
    </Suspense>
  );
}
