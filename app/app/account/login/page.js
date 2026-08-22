import { Suspense } from "react";
import { LoginPage } from "@/components/Account/LoginPage";

export const metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
