// src/services/api.service.js
import axios from 'axios';

// Get API base URL from environment variable
function getApiBaseUrl() {
  // If explicitly set via environment variable, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.DEV) {
      console.log('✅ Using API base URL from env:', envUrl);
    }
    return envUrl;
  }
  
  // In production (when served from same server), use relative URLs
  // This allows the frontend to work when served from the same origin as the API
  if (import.meta.env.PROD) {
    // When served from the same origin, use relative URLs (empty string)
    // This eliminates CORS issues since requests go to the same server
    return '';
  }
  
  // Development default: use port 8070 (matching docker-compose)
  const defaultUrl = 'http://localhost:8070';
  if (import.meta.env.DEV) {
    console.log('✅ Development mode: Using API base URL:', defaultUrl);
  }
  return defaultUrl;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000,
  transformResponse: [
    function (data, headers) {
      const contentType = headers?.['content-type'] || headers?.['Content-Type'] || '';
      
      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        try {
          if (typeof data === 'string') {
            return JSON.parse(data);
          }
          return data;
        } catch (e) {
          console.warn('Failed to parse JSON response:', e);
          return data;
        }
      }
      
      return data;
    }
  ]
});

// Log the base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('🔍 API Configuration:');
  console.log('  Base URL:', apiClient.defaults.baseURL);
  console.log('  Environment mode:', import.meta.env.MODE);
}

// Add request interceptor to attach token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token && !config.url.includes('/auth/login')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  error => {
    if (error.response) {
      const { status, data, headers } = error.response;    
      const url = error.config?.url || '';
      
      const contentType = headers?.['content-type'] || headers?.['Content-Type'] || '';
      const isNonJsonResponse = typeof data === 'string' || 
                               contentType.includes('text/html') || 
                               contentType.includes('text/xml');
      
      if (import.meta.env.DEV) {
        console.error(`❌ ${status} ${url}`, isNonJsonResponse ? `[Non-JSON response]` : data);
      }    
      
      // Handle unauthorized - redirect to login
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }    
      
      // Handle forbidden
      if (status === 403) {
        const backendMessage = (typeof data === 'string') ? data : (data?.message || data?.title);
        return Promise.reject(new Error(backendMessage || 'Access denied. Insufficient permissions.'));
      }    
      
      // Handle server errors (500+)
      if (status >= 500) {
        let errorMessage = `Server error (${status}).`;
        if (data?.message) {
          errorMessage = data.message;
        }
        error.userMessage = errorMessage;
        return Promise.reject(error);
      }    
      
      const message = data?.message || data?.title || data?.error || 'An error occurred';
      error.userMessage = message;
      return Promise.reject(error);
    }   
    
    // Network errors
    if (error.request) {
      const isCorsError = !error.response && 
                         (error.message?.includes('CORS') || 
                          error.code === 'ERR_NETWORK');
      
      if (isCorsError) {
        const frontendOrigin = window.location.origin;
        const backendUrl = apiClient.defaults.baseURL || window.location.origin;
        
        let errorMessage;
        if (!apiClient.defaults.baseURL || apiClient.defaults.baseURL === '') {
          errorMessage = `Connection Error: Unable to reach the API server at ${frontendOrigin}. Please ensure the server is running.`;
        } else {
          errorMessage = `CORS Configuration Error: The backend API at ${backendUrl} is not configured to allow requests from ${frontendOrigin}.`;
        }
        
        console.error('🚫 Connection Error:', { frontendOrigin, backendUrl: backendUrl || '(same origin)' });
        
        const corsError = new Error(errorMessage);
        corsError.isCorsError = true;
        return Promise.reject(corsError);
      }
      
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
     
    return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
  }
);

// Auth Service
export const authService = {
  // Login for employees/managers (NRC) or admins (username)
  async login(credentials) {
    // Determine endpoint based on credential type
    const endpoint = credentials.username ? '/auth/admin/login' : '/auth/login';
    const payload = credentials.username 
      ? { username: credentials.username, password: credentials.password }
      : { nrc: credentials.nrc, password: credentials.password };
    
    const response = await apiClient.post(endpoint, payload);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      
      // Backend returns 'employee' object, map it to 'user'
      const userData = { ...response.data.employee };
      if (userData.role && !userData.roles) {
        userData.roles = [userData.role];
      } else if (!userData.roles) {
        userData.roles = [];
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async getProfile() {
    const user = getCurrentUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    const response = await apiClient.get(`/api/employees/${user.id}`);
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    localStorage.removeItem('refreshToken');
    window.location.href = '/#/auth/login';
  }
};

// Leave Service
export const leaveService = {
  // Apply for leave
  async apply(leaveData) {
    const response = await apiClient.post('/api/leaves', leaveData);
    return response.data;
  },

  // Get my leave history
  async getMyLeaves() {
    const response = await apiClient.get('/api/leaves');
    return response.data;
  },

  // Get leave balance
  async getBalance() {
    const response = await apiClient.get('/api/leaves/balance');
    return response.data;
  },

  // Get pending leaves (manager/admin)
  async getPending() {
    const response = await apiClient.get('/api/leaves/pending');
    return response.data;
  },

  // Approve leave (manager/admin)
  async approve(id) {
    const response = await apiClient.put(`/api/leaves/${id}/approve`);
    return response.data;
  },

  // Reject leave (manager/admin)
  async reject(id) {
    const response = await apiClient.put(`/api/leaves/${id}/reject`);
    return response.data;
  }
};

// Leave Type Service (admin)
export const leaveTypeService = {
  async getAll() {
    const response = await apiClient.get('/api/leave-types');
    return response.data;
  },

  async create(leaveType) {
    const response = await apiClient.post('/api/leave-types', leaveType);
    return response.data;
  },

  async update(id, leaveType) {
    const response = await apiClient.put(`/api/leave-types/${id}`, leaveType);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/api/leave-types/${id}`);
    return response.data;
  }
};

// Employee Service (admin)
export const employeeService = {
  async getAll() {
    const response = await apiClient.get('/api/employees');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/employees/${id}`);
    return response.data;
  },

  async create(employee) {
    const response = await apiClient.post('/api/employees', employee);
    return response.data;
  },

  async createAdmin(admin) {
    const response = await apiClient.post('/api/admins', admin);
    return response.data;
  },

  async update(id, employee) {
    const response = await apiClient.put(`/api/employees/${id}`, employee);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/api/employees/${id}`);
    return response.data;
  },

  // Download CSV template
  async downloadTemplate() {
    const response = await apiClient.get('/api/employees/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Bulk upload employees from CSV
  async bulkUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/employees/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

// Utility function to get current user
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = getCurrentUser();
  return !!(token && user);
};

// Utility function to check user role
export const hasRole = (role) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.includes(role);
  }
  
  return user.role === role;
};

// Utility function to check if user has any of the specified roles
export const hasAnyRole = (roles) => {
  const user = getCurrentUser();
  if (!user || !Array.isArray(roles)) return false;
  
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(userRole => roles.includes(userRole));
  }
  
  return roles.includes(user.role);
};

export default apiClient;
