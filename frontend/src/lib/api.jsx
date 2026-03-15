import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

export { BACKEND_URL };
export default api;