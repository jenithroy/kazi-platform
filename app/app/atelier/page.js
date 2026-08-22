import { Suspense } from 'react'
import AtelierPage from '@/components/Atelier/AtelierPage'

export const metadata = {
  title: 'Design Your Garment',
  description:
    'Build a custom garment in the Kazi Atelier — pick a silhouette, colour and print placement, then send your design straight to a manufacturing quote.',
  alternates: { canonical: '/atelier' },
  openGraph: { url: '/atelier' },
}

export default function AtelierRoute() {
  return (
    <Suspense fallback={<h1 className="sr-only">Design your garment in the Kazi Atelier</h1>}>
      <AtelierPage />
    </Suspense>
  )
}
