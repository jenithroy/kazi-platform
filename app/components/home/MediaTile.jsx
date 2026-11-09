import Image from "next/image";
import { resolveVideo } from "@/lib/public-assets";
import { AutoVideo } from "@/components/home/AutoVideo";

// A rounded photo tile with an optional video slot. Pass `videoBase` (a path with no
// extension, e.g. "/videos/home/step-3-production") and, if a matching .mp4 / .webm exists in
// public/, the clip plays over the photo (which becomes its poster) — so a worker video can
// be dropped in later without touching this code.
export function MediaTile({ image, alt, videoBase, sizes, aspect = "aspect-square", className = "" }) {
  const video = videoBase ? resolveVideo(videoBase) : null;

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] bg-paper-raised md:rounded-[2rem] ${aspect} ${className}`}>
      <Image src={image} alt={alt} fill sizes={sizes} className="object-cover" />
      {video && <AutoVideo mp4={video.mp4} webm={video.webm} poster={image} />}
    </div>
  );
}
