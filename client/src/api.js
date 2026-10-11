import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('calculatrade_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Ошибка запроса к API';
    return Promise.reject(new Error(message));
  }
);

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('calculatrade_token', token);
    return;
  }

  localStorage.removeItem('calculatrade_token');
};

export const auth = {
  register: (login, password) => api.post('/auth/register', { login, password }),
  login: (login, password) => api.post('/auth/login', { login, password }),
  logout: () => api.post('/auth/logout'),
  refresh: (token) => api.post('/auth/refresh', { token }),
};

export const criteriaApi = {
  get: () => api.get('/criteria'),
  save: (payload) => api.put('/criteria', payload),
};

export const assetsApi = {
  list: () => api.get('/assets'),
  create: (payload) => api.post('/assets', payload),
  update: (id, payload) => api.put(`/assets/${id}`, payload),
  remove: (id) => api.delete(`/assets/${id}`),
};

export const risksApi = {
  list: () => api.get('/risks'),
  create: (payload) => api.post('/risks', payload),
  update: (id, payload) => api.put(`/risks/${id}`, payload),
  remove: (id) => api.delete(`/risks/${id}`),
};

export const measuresApi = {
  list: () => api.get('/measures'),
  create: (payload) => api.post('/measures', payload),
  update: (id, payload) => api.put(`/measures/${id}`, payload),
  remove: (id) => api.delete(`/measures/${id}`),
  linkRisk: (id, riskId) => api.post(`/measures/${id}/link-risk`, { riskId }),
  unlinkRisk: (id) => api.delete(`/measures/${id}/link-risk`),
};

export default api;
