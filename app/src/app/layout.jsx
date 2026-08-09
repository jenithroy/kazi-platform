import { MotionConfig } from 'framer-motion'
import { SmoothScroll } from '../components/SmoothScroll/SmoothScroll'
import { CartProvider } from '../lib/cart-context'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import './globals.css'

export const metadata = {
  title: 'Kazi Manufacturing',
  description:
    'Kazi Manufacturing — custom apparel manufacturing for UK clothing brands, crafted in Kathmandu, Nepal.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body>
        <MotionConfig reducedMotion="user">
          <CartProvider>
            <SmoothScroll>{children}</SmoothScroll>
          </CartProvider>
        </MotionConfig>
      </body>
    </html>
  )
}
