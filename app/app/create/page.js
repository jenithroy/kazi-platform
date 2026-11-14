import { CreatePage } from "@/components/Create/CreatePage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/create");
}

export default function CreateRoute() {
  return <CreatePage />;
}
