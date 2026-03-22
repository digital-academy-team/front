import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app/App'
import { AuthProvider } from './app/store/AuthContext'
import { CartProvider } from './app/store/CartContext'
import { WishlistProvider } from './app/store/WishlistContext'
import { Toaster } from 'sonner'

// Ensure no stale dark class from a previous session
document.documentElement.classList.remove('dark')
localStorage.removeItem('da_theme')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <App />
          <Toaster position="top-right" richColors />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
)
