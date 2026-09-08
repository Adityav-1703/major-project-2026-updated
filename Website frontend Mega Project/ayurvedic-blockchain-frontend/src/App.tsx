import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import Verify from '@/pages/Verify'
import Upload from '@/pages/Upload'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ChatPage from '@/pages/ChatPage'
import ConsumerDashboard from '@/pages/ConsumerDashboard'
import Shop from '@/pages/Shop'
import Checkout from '@/pages/Checkout'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeProvider } from '@/context/ThemeContext'
import { HerbDataProvider } from '@/context/HerbDataContext'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AIChatbot } from '@/components/layout/AIChatbot'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/shop" element={<Shop />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consumer"
          element={
            <ProtectedRoute>
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/:batchId"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <HerbDataProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <div className="relative min-h-screen">
                <div className="fixed right-4 top-4 z-50 flex gap-2">
                  <LanguageSwitcher />
                </div>
                <ThemeToggle />
                <AnimatedRoutes />
                <SiteFooter />
                <AIChatbot />
              </div>
            </Router>
          </HerbDataProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
