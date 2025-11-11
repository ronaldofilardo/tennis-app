// src/config/api.ts
// Para deploy na Vercel e ambiente local:
// 1. Usa VITE_API_URL se definida (Vercel ou .env.local)
// 2. Usa '/api' para desenvolvimento local com proxy Vite
// 3. Fallback para 'http://localhost:3001' (servidor de teste otimizado)

let API_URL = '';
if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
  API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '');
} else if (typeof window !== 'undefined') {
  API_URL = '/api';
} else {
  API_URL = 'http://localhost:3001';
}

export { API_URL };