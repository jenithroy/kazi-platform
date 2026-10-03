import { Suspense } from 'react'
import AtelierPage from '@/components/Atelier/AtelierPage'
import { pageMetadata } from '@/lib/seo'

export function generateMetadata() {
  return pageMetadata('/atelier')
}

export default function AtelierRoute() {
  return (
    <Suspense fallback={<h1 className="sr-only">Design your garment in the Kazi Atelier</h1>}>
      <AtelierPage />
    </Suspense>
  )
}
