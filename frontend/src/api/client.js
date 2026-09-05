import axios from 'axios';

// The backend runs on http://127.0.0.1:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// API Service functions
export const checkHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const getDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const getPayments = async (params = {}) => {
  const res = await api.get('/payments', { params });
  return res.data;
};

export const getPaymentDetails = async (paymentId) => {
  const res = await api.get(`/payments/${paymentId}`);
  return res.data;
};

export const runRecoveryAgent = async (paymentId) => {
  const res = await api.post(`/agent/run/${paymentId}`);
  return res.data;
};

export const getAgentLogs = async (params = {}) => {
  const res = await api.get('/agent/logs', { params });
  return res.data;
};

export const getRecoveryActions = async (params = {}) => {
  const res = await api.get('/recovery/actions', { params });
  return res.data;
};

export default api;
