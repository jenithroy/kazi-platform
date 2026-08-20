import { Suspense } from "react";
import { LoginPage } from "@/components/Account/LoginPage";

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
