import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kazi Manufacturing | Garment Factory Nepal | Custom Apparel',
  description: 'Leading garment manufacturer in Kathmandu, Nepal. Ethical production of custom t-shirts, hoodies, private label clothing. Embroidery, DTG & screen printing. 0% UK duty, MOQ 50 units.',
  metadataBase: new URL('https://kazimanufacturing.com'),
  alternates: {
    canonical: 'https://kazimanufacturing.com',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'garment factory Nepal',
    'clothing manufacturer Nepal',
    'apparel manufacturing Kathmandu',
    'custom t-shirt printing Nepal',
    'private label clothing',
    'embroidery services Nepal',
    'DTG printing Nepal',
    'screen printing Kathmandu',
    'wholesale clothing Nepal',
    'UK duty free Nepal imports',
  ],
  openGraph: {
    type: 'website',
    url: 'https://kazimanufacturing.com',
    title: 'Kazi Manufacturing | Garment Factory Nepal',
    description: 'Ethical garment manufacturer in Kathmandu, Nepal. Custom apparel, embroidery, DTG & screen printing. 0% UK duty, MOQ 50 units.',
    siteName: 'Kazi Manufacturing',
    images: [
      {
        url: 'https://kazimanufacturing.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Kazi Manufacturing - Garment Factory Nepal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kazi Manufacturing | Garment Factory Nepal',
    description: 'Ethical garment manufacturer in Kathmandu, Nepal. Custom apparel, embroidery, DTG & screen printing. 0% UK duty, MOQ 50 units.',
    images: ['https://kazimanufacturing.com/og-image.jpg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LocalBusiness', 'Organization'],
      '@id': 'https://kazimanufacturing.com/#organization',
      name: 'Kazi Manufacturing',
      description:
        'Ethical garment manufacturer in Kathmandu, Nepal. Custom t-shirts, hoodies, private label clothing, embroidery, DTG printing, screen printing. 0% UK duty, MOQ 50 units.',
      url: 'https://kazimanufacturing.com',
      email: 'hello@kazimanufacturing.com',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Kathmandu',
        addressRegion: 'Bagmati',
        addressCountry: 'NP',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '27.7172',
        longitude: '85.3240',
      },
      openingHours: 'Mo-Fr 09:00-18:00',
      priceRange: '$$',
      areaServed: ['GB', 'US', 'AU', 'EU'],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Garment Manufacturing Services',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'DTG Printing', description: 'Direct-to-garment digital printing for custom apparel' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Embroidery', description: 'High-quality embroidery on t-shirts, hoodies and caps' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Screen Printing', description: 'Bulk screen printing for brands and events' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'DTF Transfers', description: 'Direct-to-film transfers for vibrant full-colour prints' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Private Label Manufacturing', description: 'Full private label garment production with custom tags and packaging' } },
        ],
      },
      sameAs: ['https://instagram.com/kazimanufacturing'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://kazimanufacturing.com/#website',
      url: 'https://kazimanufacturing.com',
      name: 'Kazi Manufacturing',
      publisher: { '@id': 'https://kazimanufacturing.com/#organization' },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
