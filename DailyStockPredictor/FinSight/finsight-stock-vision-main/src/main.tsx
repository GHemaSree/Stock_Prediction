import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { OrderProvider } from './contexts/OrderContext'

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OrderProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </OrderProvider>
  </React.StrictMode>
);
