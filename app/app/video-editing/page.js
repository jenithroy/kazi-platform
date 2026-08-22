import { VideoEditingPage } from "@/components/VideoEditingPage";

export const metadata = {
  title: "Video Editing",
  description:
    "Kazi's in-house editing studio — product video, campaign films and social cut-downs for the brands we manufacture for.",
  alternates: { canonical: "/video-editing" },
  openGraph: { url: "/video-editing" },
};

export default function VideoEditingRoute() {
  return <VideoEditingPage />;
}
