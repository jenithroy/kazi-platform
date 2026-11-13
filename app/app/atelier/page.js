import { Suspense } from 'react'
import AtelierPage from '@/components/Atelier/AtelierPage'
import { JsonLd } from '@/components/JsonLd'
import { pageMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, webAppJsonLd } from '@/lib/structured-data'

export function generateMetadata() {
  return pageMetadata('/atelier')
}

export default function AtelierRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Design in the Atelier', path: '/atelier/' },
        ])}
      />
      <JsonLd
        data={webAppJsonLd({
          name: 'Kazi Atelier — 3D Custom Garment Designer',
          path: '/atelier/',
          description:
            'Interactive 3D and 2D custom clothing configurator. Choose a blank garment silhouette, fabric weight, colourway and artwork placement before requesting a low-MOQ manufacturing quote.',
          image: '/images/home/atelier-poster.webp',
          featureList: [
            '3D and 2D garment preview across tees, hoodies, long-sleeves, vests, sweatpants, aprons and totes',
            'Custom colourways, fabrics, all-over patterns and print/embroidery artwork layers',
            'Direct handoff to an itemised manufacturing quote from 100 units',
          ],
        })}
      />
      <Suspense fallback={<h1 className="sr-only">Design your garment in the Kazi Atelier</h1>}>
        <AtelierPage />
      </Suspense>
    </>
  )
}
