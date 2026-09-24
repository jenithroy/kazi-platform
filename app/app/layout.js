import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { CookieConsentProvider } from "@/lib/cookie-consent";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_PHONE } from "@/lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kazi Manufacturing | Custom Apparel Manufacturing in Nepal",
    template: "%s | Kazi Manufacturing",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "apparel manufacturing Nepal",
    "clothing manufacturer Kathmandu",
    "custom garment manufacturing",
    "private label clothing",
    "small batch clothing manufacturer",
    "UK clothing brand manufacturer",
  ],
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: SITE_NAME,
    title: "Kazi Manufacturing | Custom Apparel Manufacturing in Nepal",
    description: SITE_DESCRIPTION,
    images: [{ url: "/hero/hero.jpeg", width: 1600, height: 900, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kazi Manufacturing | Custom Apparel Manufacturing in Nepal",
    description: SITE_DESCRIPTION,
    images: ["/hero/hero.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: `${SITE_URL}/images/logo/kazi-logo-trimmed.png`,
  image: `${SITE_URL}/hero/hero.jpeg`,
  email: "hello@kazimanufacturing.com",
  telephone: SITE_PHONE,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kathmandu",
    addressCountry: "NP",
  },
  areaServed: "GB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className="h-full" suppressHydrationWarning>
      <head>
        {/* Flags that JS is running before first paint, so Reveal's hidden-until-scrolled
            state only applies when something will actually reveal it again (see globals.css). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body id="top" className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <CookieConsentProvider>
          <CartProvider>
            <SmoothScroll>
              <Nav />
              <PageMain>{children}</PageMain>
              <Footer />
              <WhatsAppButton />
              <CartDrawer />
            </SmoothScroll>
          </CartProvider>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
