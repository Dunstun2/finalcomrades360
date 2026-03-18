import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider, ToastViewport } from './components/ui/toast'
import App from './App.jsx'
import './styles/global.css' // Global styles with standard dimensions
import './styles.css'
import './styles/ecommerce-standards.css'
import { initPerformanceMonitoring } from './utils/performance';

// Initialize performance monitoring
initPerformanceMonitoring();

// Filter noisy React Router future-flag warnings in development only
if (import.meta.env?.DEV && typeof console !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args?.[0];
    if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) {
      return; // swallow this specific warning
    }
    originalWarn(...args);
  };
}

// Configure QueryClient with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - most data doesn't change that fast
      cacheTime: 60 * 60 * 1000, // 60 minutes - keep cache longer
      refetchOnWindowFocus: false, // Don't refetch when tab refocused
      refetchInterval: false, // DISABLED - Real-time sync handles updates, not polling
      retry: 1,
      // Prevent aggressive refetch on mount
      refetchOnMount: false,
    },
  },
});

// Render the app directly - Suspense in App.jsx will handle loading states
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
            <ToastViewport />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
