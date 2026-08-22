import { ForgotPasswordPage } from "@/components/Account/ForgotPasswordPage";

export const metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
