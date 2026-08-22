import { Suspense } from "react";
import { RegisterPage } from "@/components/Account/RegisterPage";

export const metadata = {
  title: "Create Account",
  robots: { index: false, follow: false },
};

export default function RegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
