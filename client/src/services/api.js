import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

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
export const getAvailableSlots = (date, duration) => api.get(`/slots/available?date=${date}${duration ? `&duration=${duration}` : ''}`);
export const createAppointment = (data) => api.post('/appointments', data);
export const lookupAppointment = (phone) => api.get(`/appointments/lookup?phone=${phone}`);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data);
export const cancelAppointmentPublic = (id) => api.patch(`/appointments/${id}/cancel-public`);
export const getBusinessHours = () => api.get('/business/hours');

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
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);

// Admin - Recurring Blocks
export const getRecurringBlocks = () => api.get('/slots/recurring');
export const createRecurringBlock = (data) => api.post('/slots/recurring', data);
export const deleteRecurringBlock = (id) => api.delete(`/slots/recurring/${id}`);

// Admin - Business Hours & Day Blocks
export const updateBusinessHours = (hours) => api.put('/business/hours', { hours });
export const getDayBlocks = () => api.get('/business/blocks');
export const createDayBlock = (data) => api.post('/business/blocks', data);
export const deleteDayBlock = (id) => api.delete(`/business/blocks/${id}`);

export default api;
