import { Suspense } from "react";
import { StoryEditor } from "@/components/admin/StoryEditor";

export const metadata = { title: "Edit post" };

// The post id travels as ?id= — a static export can't pre-generate a page per post here.
export default function AdminStoryEditRoute() {
  return (
    <Suspense fallback={null}>
      <StoryEditor />
    </Suspense>
  );
}
