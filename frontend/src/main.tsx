// frontend/src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 1. Importa o BrowserRouter
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Envolve o componente App com o BrowserRouter */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
