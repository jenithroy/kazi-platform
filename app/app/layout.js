import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { SiteChrome } from "@/components/SiteChrome";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { CookieConsentProvider } from "@/lib/cookie-consent";
import { JsonLd } from "@/components/JsonLd";
import { getSeoSettings } from "@/lib/cms";
import { siteMetadata } from "@/lib/seo";
import { resolveSiteSettings } from "@/lib/seo-core";
import { siteJsonLd } from "@/lib/structured-data";

// Site-wide defaults and verification tags — editable in /admin → Settings.
export function generateMetadata() {
  return siteMetadata();
}

export default async function RootLayout({ children }) {
  const site = resolveSiteSettings(await getSeoSettings());

  return (
    <html lang="en" className="h-full">
      <head>
        {/* General Sans is no longer the body face, but the Atelier text tool still offers it (lib/design-layers.js). */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
        <JsonLd data={siteJsonLd(site)} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <CookieConsentProvider>
          <CartProvider>
            <SiteChrome
              nav={<Nav />}
              footer={
                <>
                  <Footer />
                  <WhatsAppButton />
                  <CartDrawer />
                </>
              }
              overlays={<CookieConsentBanner />}
            >
              {children}
            </SiteChrome>
          </CartProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
