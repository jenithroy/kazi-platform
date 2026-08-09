import { Suspense } from 'react'
import RegisterPage from '../../../views/AccountPages/RegisterPage'

export default function RegisterRoute() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  )
}
