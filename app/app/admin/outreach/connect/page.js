import { Suspense } from "react";
import { ConnectCallback } from "@/components/admin/outreach/ConnectCallback";

export const metadata = { title: "Connecting a mailbox" };

// Google's OAuth redirect lands here with ?code=&state= (see the outreach-api function).
export default function ConnectRoute() {
  return (
    <Suspense fallback={null}>
      <ConnectCallback />
    </Suspense>
  );
}
