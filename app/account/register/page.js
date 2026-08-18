import { Suspense } from "react";
import { RegisterPage } from "@/components/Account/RegisterPage";

export default function RegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
