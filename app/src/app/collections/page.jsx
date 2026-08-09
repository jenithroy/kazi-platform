import { Suspense } from 'react'
import CollectionsPage from '../../views/CollectionsPage/CollectionsPage'

export default function CollectionsRoute() {
  return (
    <Suspense fallback={null}>
      <CollectionsPage />
    </Suspense>
  )
}
