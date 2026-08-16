'use client'

import { useRef } from 'react'
import { Nav } from '../components/Nav/Nav'
import { Hero } from '../components/Hero/Hero'
import { TrustBar } from '../components/TrustBar/TrustBar'
import { ImpactStats } from '../components/ImpactStats/ImpactStats'
import { Heritage } from '../components/Heritage/Heritage'
import { Collection } from '../components/Collection/Collection'
import { HowWeWork } from '../components/HowWeWork/HowWeWork'
import { Testimonials } from '../components/Testimonials/Testimonials'
import { Atelier } from '../components/Atelier/Atelier'
import { QuoteForm } from '../components/QuoteForm/QuoteForm'
import { Footer } from '../components/Footer/Footer'
import { useHeroScrolled } from '../hooks/useHeroScrolled'

function HomePage() {
  const heroRef = useRef(null)
  const isScrolled = useHeroScrolled(heroRef)

  return (
    <>
      <Nav isScrolled={isScrolled} />
      <Hero ref={heroRef} />
      <TrustBar />
      <ImpactStats />
      <Heritage />
      <Collection />
      <HowWeWork />
      <Testimonials />
      <Atelier />
      <QuoteForm />
      <Footer />
    </>
  )
}

export default HomePage
