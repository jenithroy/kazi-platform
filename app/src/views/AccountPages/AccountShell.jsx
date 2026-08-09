'use client'

import { motion } from 'framer-motion'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export function AccountShell({ children }) {
  return (
    <>
      <Nav isScrolled />
      <main className="bg-bone min-h-screen flex items-center justify-center px-8 pt-32 pb-24">
        <motion.div
          className="w-full max-w-md border border-pine/15 bg-paper p-8 md:p-10"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          {children}
        </motion.div>
      </main>
      <Footer />
    </>
  )
}
