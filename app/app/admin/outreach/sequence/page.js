import { Suspense } from "react";
import { SequenceEditorPage } from "@/components/admin/outreach/SequenceEditor";

export const metadata = { title: "Sequence" };

// The sequence id travels as ?id=; without one this is a new sequence.
export default function SequenceRoute() {
  return (
    <Suspense fallback={null}>
      <SequenceEditorPage />
    </Suspense>
  );
}
