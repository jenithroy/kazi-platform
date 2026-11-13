import { VideoEditingPage, VIDEO_EDITING_FAQS, VIDEO_EDITING_SERVICES } from "@/components/VideoEditingPage";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, faqListJsonLd, serviceCatalogJsonLd } from "@/lib/structured-data";

export function generateMetadata() {
  return pageMetadata("/video-editing");
}

export default function VideoEditingRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Manufacturing Services", path: "/heritage/" },
          { name: "Video Editing Studio", path: "/video-editing/" },
        ])}
      />
      <JsonLd
        data={serviceCatalogJsonLd({
          name: "Kazi Apparel & Product Video Editing Studio",
          path: "/video-editing/",
          description:
            "In-house fashion and product video editing studio producing product videos, campaign films and social cut-downs for clothing brands.",
          services: VIDEO_EDITING_SERVICES,
        })}
      />
      <JsonLd data={faqListJsonLd(VIDEO_EDITING_FAQS)} />
      <VideoEditingPage />
    </>
  );
}
