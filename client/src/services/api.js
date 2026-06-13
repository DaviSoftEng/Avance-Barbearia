import axios from 'axios';

// Base da API:
// - produção (site servido pelo próprio servidor): relativa "/api" → mesma origem
// - dev (Vite na 5173): host atual na porta 3001 → funciona em localhost e pelo IP da rede
const baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? `http://${window.location.hostname}:3001/api` : '/api');
const api = axios.create({ baseURL });

// Origem da API sem o "/api" — usada para montar URLs de imagens enviadas
export const apiOrigin = baseURL.replace(/\/api\/?$/, '');

// Resolve o caminho de imagem do serviço para uma URL utilizável:
// http(s):// → externo (como está) · /uploads/ → backend · /cortes/ etc → próprio site
export function mediaUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/uploads/')) return apiOrigin + p;
  return p;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada (401 com token existente) → desloga e manda pro login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isLogin = url.includes('/auth/login');
    if (err.response?.status === 401 && localStorage.getItem('token') && !isLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Public
export const getServices = () => api.get('/services');
export const getAvailableSlots = (date, duration) => api.get(`/slots/available?date=${encodeURIComponent(date)}${duration ? `&duration=${encodeURIComponent(duration)}` : ''}`);
export const createAppointment = (data) => api.post('/appointments', data);
export const lookupAppointment = (phone) => api.get(`/appointments/lookup?phone=${encodeURIComponent(phone)}`);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data);
export const cancelAppointmentPublic = (id, phone) => api.patch(`/appointments/${id}/cancel-public`, { phone });
export const getBusinessHours = () => api.get('/business/hours');
export const getBookingSettings = () => api.get('/business/settings');

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });

// Admin - Appointments
export const getAppointments = (params) => api.get('/appointments', { params });
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });
export const cancelAppointment = (id) => api.patch(`/appointments/${id}/cancel`);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);
export const getStats = () => api.get('/appointments/stats');
export const getClients = (search) => api.get('/appointments/clients', { params: search ? { search } : {} });

// Admin - Services
export const getAllServices = () => api.get('/services/all');
export const createService = (data) => api.post('/services', data);
export const uploadServiceImage = (file) => {
  const fd = new FormData();
  fd.append('image', file);
  return api.post('/services/upload', fd);
};
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);

// Admin - Recurring Blocks
export const getRecurringBlocks = () => api.get('/slots/recurring');
export const createRecurringBlock = (data) => api.post('/slots/recurring', data);
export const deleteRecurringBlock = (id) => api.delete(`/slots/recurring/${id}`);

// Admin - Recurring Exceptions (adiantar/remarcar ou cancelar um fixo numa semana)
export const getRecurringExceptions = () => api.get('/slots/exceptions');
export const createRecurringException = (blockId, data) => api.post(`/slots/recurring/${blockId}/exception`, data);
export const deleteRecurringException = (id) => api.delete(`/slots/exceptions/${id}`);

// Admin - Business Hours & Day Blocks
export const updateBusinessHours = (hours) => api.put('/business/hours', { hours });
export const updateBookingSettings = (data) => api.put('/business/settings', data);
export const getDayBlocks = () => api.get('/business/blocks');
export const createDayBlock = (data) => api.post('/business/blocks', data);
export const deleteDayBlock = (id) => api.delete(`/business/blocks/${id}`);

export default api;
