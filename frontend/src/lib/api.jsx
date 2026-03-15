import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: '/api',  // Proxy Vite → backend 8000
  withCredentials: true,
});

export { BACKEND_URL };  // ← Named export ajouté
export default api;
