import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { SmoothScroll } from "@/components/SmoothScroll";
import { PageMain } from "@/components/PageMain";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata = {
  title: "Kazi Manufacturing",
  description:
    "Kazi Manufacturing — custom apparel manufacturing for UK clothing brands, crafted in Kathmandu, Nepal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <SmoothScroll>
            <Nav />
            <PageMain>{children}</PageMain>
            <Footer />
            <WhatsAppButton />
            <CartDrawer />
          </SmoothScroll>
        </CartProvider>
      </body>
    </html>
  );
}
