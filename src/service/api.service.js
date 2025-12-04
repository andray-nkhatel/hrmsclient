// src/service/api.service.js
import axios from 'axios';

// Get API base URL from environment variable
function getApiBaseUrl() {
  const currentOrigin = window.location.origin;
  const currentHostname = window.location.hostname;
  const isNetworkAccess = currentHostname !== 'localhost' && currentHostname !== '127.0.0.1';
  
  // If explicitly set via environment variable, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    let envUrl = import.meta.env.VITE_API_BASE_URL;
    
    // If accessing from network IP and API URL uses localhost, replace with current hostname
    if (isNetworkAccess && envUrl.includes('localhost')) {
      try {
        const url = new URL(envUrl);
        url.hostname = currentHostname;
        envUrl = url.toString();
        if (import.meta.env.DEV) {
          console.log('✅ Network access detected: Updated API URL from localhost to', currentHostname);
        }
      } catch (e) {
        // If URL parsing fails, try simple string replacement
        envUrl = envUrl.replace(/localhost/g, currentHostname);
        if (import.meta.env.DEV) {
          console.log('✅ Network access detected: Updated API URL from localhost to', currentHostname);
        }
      }
    }
    
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
  
  // In development, use relative URLs to leverage Vite proxy
  // This eliminates CORS issues by routing requests through the dev server
  // The Vite proxy (configured in vite.config.mjs) will forward /api and /auth to the backend
  if (import.meta.env.DEV) {
    console.log('✅ Development mode: Using relative URLs (Vite proxy will handle routing)');
    return '';
  }
  
  // Fallback: use port 8080 (or detect from current origin)
  // If accessing from network IP, use the same hostname with port 8080
  let defaultUrl;
  if (isNetworkAccess) {
    // Extract port from current origin or use default 8080
    const currentPort = window.location.port;
    // If frontend is on 8070, backend is likely on 8080
    const backendPort = currentPort === '8070' ? '8080' : '8080';
    defaultUrl = `http://${currentHostname}:${backendPort}`;
    if (import.meta.env.DEV) {
      console.log('✅ Network access detected: Using API base URL:', defaultUrl);
    }
  } else {
    defaultUrl = 'http://localhost:8070';
    if (import.meta.env.DEV) {
      console.log('✅ Development mode: Using API base URL:', defaultUrl);
    }
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
    // Don't attach token to auth endpoints
    if (token && !config.url.includes('/auth/login') && !config.url.includes('/auth/admin/login') && !config.url.includes('/auth/register')) {
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
      
      // Handle unauthorized - but only redirect if it's NOT a login/register attempt
      // Login/register 401s should show error message, not redirect
      if (status === 401) {
        const isAuthEndpoint = url.includes('/auth/login') || 
                              url.includes('/auth/admin/login') || 
                              url.includes('/auth/register');
        
        if (!isAuthEndpoint) {
          // Session expired on protected route - redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Use hash routing for navigation
          window.location.href = '/#/auth/login';
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }
        // For auth endpoints, just return the error without redirecting
        // The login/register component will handle the error message
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
      const frontendOrigin = window.location.origin;
      const backendUrl = apiClient.defaults.baseURL || window.location.origin;
      
      // Check for connection refused (backend not running or unreachable)
      const isConnectionRefused = error.code === 'ERR_CONNECTION_REFUSED' || 
                                  error.message?.includes('CONNECTION_REFUSED') ||
                                  error.message?.includes('Failed to fetch');
      
      // Check for CORS errors
      const isCorsError = !error.response && 
                         !isConnectionRefused &&
                         (error.message?.includes('CORS') || 
                          error.code === 'ERR_NETWORK');
      
      if (isConnectionRefused) {
        let errorMessage = `Connection Refused: Unable to reach the backend API at ${backendUrl}. `;
        errorMessage += `Please ensure the backend server is running and accessible.`;
        if (backendUrl.includes('localhost') && frontendOrigin.includes('192.168')) {
          errorMessage += `\n\nNote: You're accessing the frontend from ${frontendOrigin}, but trying to connect to localhost. `;
          errorMessage += `Make sure the backend is accessible at ${backendUrl.replace('localhost', window.location.hostname)}.`;
        }
        
        console.error('🚫 Connection Refused:', { frontendOrigin, backendUrl: backendUrl || '(same origin)' });
        
        const connectionError = new Error(errorMessage);
        connectionError.isConnectionError = true;
        return Promise.reject(connectionError);
      }
      
      if (isCorsError) {
        let errorMessage;
        if (!apiClient.defaults.baseURL || apiClient.defaults.baseURL === '') {
          errorMessage = `Connection Error: Unable to reach the API server at ${frontendOrigin}. Please ensure the server is running.`;
        } else {
          errorMessage = `CORS Configuration Error: The backend API at ${backendUrl} is not configured to allow requests from ${frontendOrigin}.`;
          errorMessage += `\n\nPlease configure the backend to allow CORS requests from ${frontendOrigin}.`;
        }
        
        console.error('🚫 CORS Error:', { frontendOrigin, backendUrl: backendUrl || '(same origin)' });
        
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
  async reject(id, reason) {
    const response = await apiClient.put(`/api/leaves/${id}/reject`, { reason });
    return response.data;
  },

  // Cancel leave (employee - own leaves only)
  async cancel(id) {
    const response = await apiClient.put(`/api/leaves/${id}/cancel`);
    return response.data;
  },

  // Get leave audit trail (manager/admin)
  async getAudit(id) {
    const response = await apiClient.get(`/api/leaves/${id}/audit`);
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

// HR Leave Management Service (Manager/Admin only)
export const hrLeaveService = {
  // Get all employees' annual leave balances
  async getAllEmployeesBalances(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.status) params.append('status', filters.status);
    const response = await apiClient.get(`/api/hr/employees/annual-leave-balances?${params.toString()}`);
    return response.data;
  },

  // Get detailed annual leave balance for an employee
  async getEmployeeBalance(employeeId) {
    const response = await apiClient.get(`/api/hr/employees/${employeeId}/annual-leave-balance`);
    return response.data;
  },

  // Adjust leave balance manually
  async adjustBalance(employeeId, adjustment) {
    const response = await apiClient.post(`/api/hr/employees/${employeeId}/annual-leave-balance/adjust`, adjustment);
    return response.data;
  },

  // Add manual accrual
  async addManualAccrual(employeeId, accrual) {
    const response = await apiClient.post(`/api/hr/employees/${employeeId}/annual-leave-balance/accrual`, accrual);
    return response.data;
  },

  // Get leave calendar
  async getCalendar(filters = {}) {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    const response = await apiClient.get(`/api/hr/leaves/calendar?${params.toString()}`);
    return response.data;
  },

  // Get department leave report
  async getDepartmentReport() {
    const response = await apiClient.get('/api/hr/leaves/department-report');
    return response.data;
  },

  // Get upcoming leaves
  async getUpcoming(days = 30) {
    const response = await apiClient.get(`/api/hr/leaves/upcoming?days=${days}`);
    return response.data;
  },

  // Process monthly accruals
  async processAccruals(month = null) {
    const params = month ? `?month=${month}` : '';
    const response = await apiClient.post(`/api/hr/leaves/process-accruals${params}`);
    return response.data;
  },

  // Export annual leave balances to Excel or PDF
  async exportBalances(format = 'excel', filters = {}) {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters.department) params.append('department', filters.department);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiClient.get(`/api/hr/employees/annual-leave-balances/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('download', `annual_leave_balances_${timestamp}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  }
};

// Core HR Service (Manager/Admin only)
export const coreHrService = {
  // Identity Information
  async getIdentity(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/identity`);
    return response.data;
  },

  async updateIdentity(employeeId, identity) {
    const response = await apiClient.post(`/api/employees/${employeeId}/identity`, identity);
    return response.data;
  },

  // Employment Details
  async getEmployment(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/employment`);
    return response.data;
  },

  async updateEmployment(employeeId, employment) {
    const response = await apiClient.post(`/api/employees/${employeeId}/employment`, employment);
    return response.data;
  },

  async getEmploymentHistory(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/employment/history`);
    return response.data;
  },

  // Positions
  async getPositions() {
    const response = await apiClient.get('/api/positions');
    return response.data;
  },

  async getPosition(id) {
    const response = await apiClient.get(`/api/positions/${id}`);
    return response.data;
  },

  async createPosition(position) {
    const response = await apiClient.post('/api/positions', position);
    return response.data;
  },

  async updatePosition(id, position) {
    const response = await apiClient.put(`/api/positions/${id}`, position);
    return response.data;
  },

  async assignPosition(employeeId, assignment) {
    const response = await apiClient.post(`/api/employees/${employeeId}/positions`, assignment);
    return response.data;
  },

  // Documents
  async getDocuments(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/documents`);
    return response.data;
  },

  async uploadDocument(employeeId, formData) {
    const response = await apiClient.post(`/api/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async downloadDocument(employeeId, documentId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async deleteDocument(employeeId, documentId) {
    const response = await apiClient.delete(`/api/employees/${employeeId}/documents/${documentId}`);
    return response.data;
  },

  // Work Lifecycle
  async getLifecycleEvents(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/lifecycle`);
    return response.data;
  },

  async createLifecycleEvent(employeeId, event) {
    const response = await apiClient.post(`/api/employees/${employeeId}/lifecycle`, event);
    return response.data;
  },

  // Onboarding
  async getOnboarding(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/onboarding`);
    return response.data;
  },

  async createOnboarding(employeeId, process) {
    const response = await apiClient.post(`/api/employees/${employeeId}/onboarding`, process);
    return response.data;
  },

  // Offboarding
  async getOffboarding(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/offboarding`);
    return response.data;
  },

  async createOffboarding(employeeId, process) {
    const response = await apiClient.post(`/api/employees/${employeeId}/offboarding`, process);
    return response.data;
  },

  // Compliance
  async getComplianceRequirements() {
    const response = await apiClient.get('/api/compliance/requirements');
    return response.data;
  },

  async createComplianceRequirement(requirement) {
    const response = await apiClient.post('/api/compliance/requirements', requirement);
    return response.data;
  },

  async getComplianceRecords(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/compliance`);
    return response.data;
  },

  async createComplianceRecord(employeeId, record) {
    const response = await apiClient.post(`/api/employees/${employeeId}/compliance`, record);
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.entity_id) params.append('entity_id', filters.entity_id);
    if (filters.performed_by) params.append('performed_by', filters.performed_by);
    const response = await apiClient.get(`/api/audit-logs?${params.toString()}`);
    return response.data;
  },

  async getEmployeeAuditLogs(employeeId) {
    const response = await apiClient.get(`/api/employees/${employeeId}/audit-logs`);
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
