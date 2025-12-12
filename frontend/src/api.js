import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
};

// Tasks API
export const tasksAPI = {
  getAll: (projectId = null) => {
    const url = projectId ? `/tasks?project_id=${projectId}` : '/tasks';
    return api.get(url);
  },
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getOne: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// Blueprints API
export const blueprintsAPI = {
  getAll: (projectId = null) => {
    const url = projectId ? `/blueprints?project_id=${projectId}` : '/blueprints';
    return api.get(url);
  },
  getOne: (id) => api.get(`/blueprints/${id}`),
  upload: (formData) => {
    return axios.post(`${API_BASE_URL}/blueprints/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  update: (id, data) => api.put(`/blueprints/${id}`, data),
  delete: (id) => api.delete(`/blueprints/${id}`),
  download: (id) => api.get(`/blueprints/${id}/download`, { responseType: 'blob' }),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
};

// Reports API
export const reportsAPI = {
  generateReport: (data) => api.post('/reports/generate', data),
  getTemplates: () => api.get('/reports/templates'),
  getReports: () => api.get('/reports'),
  downloadReport: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;

// Auth API
export const authAPI = {
  login: (data) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return api.post('/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  register: (data) => api.post('/register', data),
  getCurrentUser: () => api.get('/users/me'),
};