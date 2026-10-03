import { OutreachNav } from "@/components/admin/outreach/parts";

export const metadata = { title: "Outreach" };

export default function OutreachLayout({ children }) {
  return (
    <>
      <OutreachNav />
      {children}
    </>
  );
}
