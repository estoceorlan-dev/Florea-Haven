import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { CartProvider } from './context/CartProvider.jsx';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { AppQueryProvider } from './queries/AppQueryProvider.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppQueryProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </AppQueryProvider>
  </StrictMode>,
);
