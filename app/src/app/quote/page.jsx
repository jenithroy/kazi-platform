import { Suspense } from 'react'
import QuotePage from '../../views/QuotePage/QuotePage'

export default function QuoteRoute() {
  return (
    <Suspense fallback={null}>
      <QuotePage />
    </Suspense>
  )
}
