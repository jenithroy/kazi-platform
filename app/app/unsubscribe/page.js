import { Suspense } from "react";
import { UnsubscribePage } from "@/components/UnsubscribePage";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default function UnsubscribeRoute() {
  return (
    <Suspense fallback={null}>
      <UnsubscribePage />
    </Suspense>
  );
}
