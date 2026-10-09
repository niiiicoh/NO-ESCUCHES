import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfirmProvider } from './components/ui/confirm';
import { App } from './app/App';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/800.css';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
