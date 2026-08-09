import { Suspense } from 'react'
import AtelierPage from '../../views/AtelierPage/AtelierPage'

export default function AtelierRoute() {
  return (
    <Suspense fallback={null}>
      <AtelierPage />
    </Suspense>
  )
}
