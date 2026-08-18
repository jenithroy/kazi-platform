import { Suspense } from 'react'
import AtelierPage from '@/components/Atelier/AtelierPage'

export default function AtelierRoute() {
  return (
    <Suspense fallback={null}>
      <AtelierPage />
    </Suspense>
  )
}
