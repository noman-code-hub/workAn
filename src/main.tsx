import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import '@/index.css';
import { BRAND } from './config/brand';

const appLogo = BRAND.logo.favicon;

const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (faviconLink) {
  faviconLink.href = appLogo;
} else {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = appLogo;
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
