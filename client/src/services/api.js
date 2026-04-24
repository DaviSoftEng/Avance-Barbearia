import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getServices = () => api.get('/services');
export const getAvailableSlots = (date) => api.get(`/slots/available?date=${date}`);
export const createAppointment = (data) => api.post('/appointments', data);

export const login = (email, password) => api.post('/auth/login', { email, password });
export const getAppointments = (params) => api.get('/appointments', { params });
export const cancelAppointment = (id) => api.patch(`/appointments/${id}/cancel`);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);
export const getRecurringBlocks = () => api.get('/slots/recurring');
export const createRecurringBlock = (data) => api.post('/slots/recurring', data);
export const deleteRecurringBlock = (id) => api.delete(`/slots/recurring/${id}`);

export default api;
