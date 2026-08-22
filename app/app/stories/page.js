import { StoriesPage } from "@/components/StoriesPage";

export const metadata = {
  title: "Stories",
  description:
    "Notes from the Kazi production floor and the brands we manufacture for — process, sourcing and behind-the-scenes updates.",
  alternates: { canonical: "/stories" },
  openGraph: { url: "/stories" },
};

export default function StoriesRoute() {
  return <StoriesPage />;
}
