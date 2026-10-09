import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ConfirmProvider } from './components/ui/confirm';
import { App } from './app/App';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/800.css';
import './styles.css';
// Pages serves static files without a fallback for client-side routes.
const Router = import.meta.env.MODE === 'pages' ? HashRouter : BrowserRouter;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </Router>
  </React.StrictMode>,
);
