import { VideoEditingPage } from "@/components/VideoEditingPage";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/video-editing");
}

export default function VideoEditingRoute() {
  return <VideoEditingPage />;
}
