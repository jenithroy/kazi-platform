import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Nav } from '../components/Nav/Nav'
import { Hero } from '../components/Hero/Hero'
import { ImpactStats } from '../components/ImpactStats/ImpactStats'
import { Heritage } from '../components/Heritage/Heritage'
import { Collection } from '../components/Collection/Collection'
import { HowWeWork } from '../components/HowWeWork/HowWeWork'
import { Testimonials } from '../components/Testimonials/Testimonials'
import { Atelier } from '../components/Atelier/Atelier'
import { QuoteForm } from '../components/QuoteForm/QuoteForm'
import { Footer } from '../components/Footer/Footer'
import { useHeroScrolled } from '../hooks/useHeroScrolled'
import { useScrollToLocationTarget } from '../hooks/useScrollToLocationTarget'

function HomePage() {
  const heroRef = useRef(null)
  const isScrolled = useHeroScrolled(heroRef)
  const location = useLocation()
  useScrollToLocationTarget(location)

  return (
    <>
      <Nav isScrolled={isScrolled} />
      <Hero ref={heroRef} />
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
