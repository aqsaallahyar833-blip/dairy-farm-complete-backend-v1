import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider} from './context/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      AuthProvider is the outermost gate. While it resolves the startup
      /api/auth/me probe it renders only a neutral loading state, so the
      Dashboard is never mounted for an unauthenticated visitor.
    */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
