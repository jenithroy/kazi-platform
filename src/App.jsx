import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AtelierPage from './pages/AtelierPage/AtelierPage'
import HeritagePage from './pages/HeritagePage/HeritagePage'
import LookbookPage from './pages/LookbookPage/LookbookPage'
import CollectionsPage from './pages/CollectionsPage/CollectionsPage'
import ProductPage from './pages/ProductPage/ProductPage'
import PricingPage from './pages/PricingPage/PricingPage'
import QuotePage from './pages/QuotePage/QuotePage'
import StoriesPage from './pages/StoriesPage/StoriesPage'
import LoginPage from './pages/AccountPages/LoginPage'
import RegisterPage from './pages/AccountPages/RegisterPage'
import ForgotPasswordPage from './pages/AccountPages/ForgotPasswordPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/atelier" element={<AtelierPage />} />
      <Route path="/heritage" element={<HeritagePage />} />
      <Route path="/lookbook" element={<LookbookPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/products/:slug" element={<ProductPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/quote" element={<QuotePage />} />
      <Route path="/stories" element={<StoriesPage />} />
      <Route path="/account/login" element={<LoginPage />} />
      <Route path="/account/register" element={<RegisterPage />} />
      <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
    </Routes>
  )
}

export default App
