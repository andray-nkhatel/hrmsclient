import apiClient from '@/service/api.service';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const state = {
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  roles: JSON.parse(localStorage.getItem('roles')) || [],
  permissions: JSON.parse(localStorage.getItem('permissions')) || [],
  isRefreshing: false,
  refreshSubscribers: [],
  requestInterceptor: null, 
  responseInterceptor: null  
};

const getters = {
  isAuthenticated: state => !!state.token,
  user: state => state.user,
  userName: state => state.user?.username || state.user?.userName || '',
  userEmail: state => state.user?.email || '',
  userRoles: state => {
    if (state.user?.roles && Array.isArray(state.user.roles)) {
      return state.user.roles;
    }
    if (state.user?.role) {
      return [state.user.role];
    }
    return state.roles.length ? state.roles : [];
  },
  userPermissions: state => state.permissions,
  hasRole: state => role => {
    if (state.user?.roles && Array.isArray(state.user.roles)) {
      return state.user.roles.includes(role);
    }
    if (state.user?.role) {
      return state.user.role === role;
    }
    return state.roles.includes(role);
  },
  hasPermission: state => permission => state.permissions.includes(permission),
  hasAnyRole: state => roles => {
    if (state.user?.roles && Array.isArray(state.user.roles)) {
      return roles.some(role => state.user.roles.includes(role));
    }
    if (state.user?.role) {
      return roles.includes(state.user.role);
    }
    return roles.some(role => state.roles.includes(role));
  },
  hasAllRoles: state => roles => {
    if (state.user?.roles && Array.isArray(state.user.roles)) {
      return roles.every(role => state.user.roles.includes(role));
    }
    if (state.user?.role) {
      return roles.includes(state.user.role);
    }
    return roles.every(role => state.roles.includes(role));
  },
  hasAnyPermission: state => permissions => permissions.some(perm => state.permissions.includes(perm)),
  tokenExpiration: state => {
    if (!state.token) return null;
    const decoded = jwtDecode(state.token);
    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  },
  isTokenExpired: (state, getters) => {
    const expiration = getters.tokenExpiration;
    if (!expiration) return true;
    return expiration <= new Date(Date.now() + 60 * 1000);
  }
};

const actions = {
  // Login action - supports both NRC (employee/manager) and username (admin)
  async login({ commit, dispatch }, credentials) {
    try {
      // Determine endpoint based on credential type
      const endpoint = credentials.username ? '/auth/admin/login' : '/auth/login';
      const payload = credentials.username 
        ? { username: credentials.username, password: credentials.password }
        : { nrc: credentials.nrc, password: credentials.password };
      
      const response = await apiClient.post(endpoint, payload);

      const { token, employee } = response.data;

      if (!token || !employee) {
        throw new Error('Invalid authentication response');
      }

      // Map employee to user for consistency
      const user = { ...employee };
      let roles = [];
      if (user.roles && Array.isArray(user.roles)) {
        roles = user.roles;
      } else if (user.role) {
        roles = [user.role];
      }

      const permissions = user.permissions || [];

      commit('SET_AUTH_DATA', { 
        token, 
        refreshToken: null, 
        user, 
        roles,
        permissions
      });

      dispatch('setupInterceptors');

      console.log('Login successful');
      return response;
    } catch (error) {
      console.error('Login error:', error);
      commit('CLEAR_AUTH_DATA');
      throw error;
    }
  },

  // Register action
  async register({ commit }, userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout action
  async logout({ commit }) {
    try {
      commit('CLEAR_AUTH_DATA');
      return true;
    } catch (error) {
      commit('CLEAR_AUTH_DATA');
      throw error;
    }
  },

  // Refresh token
  async refreshToken({ commit, state }) {
    if (state.isRefreshing) {
      return new Promise((resolve, reject) => {
        state.refreshSubscribers.push({ resolve, reject });
      });
    }

    commit('SET_REFRESHING', true);

    try {
      const response = await axios.post('/api/refresh-token', {
        refreshToken: state.refreshToken
      });

      const { token, refreshToken } = response.data;

      commit('UPDATE_TOKENS', { token, refreshToken });
      commit('SET_REFRESHING', false);

      state.refreshSubscribers.forEach(callback => callback.resolve(token));
      commit('CLEAR_SUBSCRIBERS');

      return token;
    } catch (error) {
      commit('SET_REFRESHING', false);
      state.refreshSubscribers.forEach(callback => callback.reject(error));
      commit('CLEAR_SUBSCRIBERS');
      commit('CLEAR_AUTH_DATA');
      throw error;
    }
  },

  // Check token and refresh if needed
  async checkTokenAndRefreshIfNeeded({ getters, dispatch }) {
    if (!getters.isAuthenticated) return null;

    if (getters.isTokenExpired) {
      try {
        return await dispatch('refreshToken');
      } catch (error) {
        return null;
      }
    }

    return state.token;
  },

  // Setup axios interceptors
  setupInterceptors({ commit, dispatch, state }) {
    axios.interceptors.request.eject(state.requestInterceptor);
    axios.interceptors.response.eject(state.responseInterceptor);

    state.requestInterceptor = axios.interceptors.request.use(
      async config => {
        if (config.url.includes('/auth/login') || 
            config.url.includes('/auth/register') || 
            config.url.includes('/auth/refresh-token')) {
          return config;
        }
        const token = await dispatch('checkTokenAndRefreshIfNeeded');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    state.responseInterceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (originalRequest.url.includes('/auth/login') || 
            originalRequest.url.includes('/auth/register')) {
          return Promise.reject(error);
        }
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        try {
          const token = await dispatch('refreshToken');
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          commit('CLEAR_AUTH_DATA');
          return Promise.reject(refreshError);
        }
      }
    );
  },

  // Fetch user profile
  async fetchUserProfile({ commit, state }) {
    if (!state.token) throw new Error('Not authenticated');
    try {
      const response = await axios.get('/api/user/profile');
      const { user, roles, permissions } = response.data;
      commit('UPDATE_USER_DATA', { user, roles, permissions });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

const mutations = {
  SET_AUTH_DATA(state, { token, refreshToken, user, roles, permissions }) {
    state.token = token;
    state.refreshToken = refreshToken;
    state.user = user;
    state.roles = roles || [];
    state.permissions = permissions || [];

    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken || '');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('roles', JSON.stringify(roles || []));
    localStorage.setItem('permissions', JSON.stringify(permissions || []));
  },

  UPDATE_TOKENS(state, { token, refreshToken }) {
    state.token = token;
    state.refreshToken = refreshToken;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  },

  UPDATE_USER_DATA(state, { user, roles, permissions }) {
    state.user = user;
    state.roles = roles || state.roles;
    state.permissions = permissions || state.permissions;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('roles', JSON.stringify(roles || state.roles));
    localStorage.setItem('permissions', JSON.stringify(permissions || state.permissions));
  },

  CLEAR_AUTH_DATA(state) {
    state.token = null;
    state.refreshToken = null;
    state.user = null;
    state.roles = [];
    state.permissions = [];
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
  },

  SET_REFRESHING(state, isRefreshing) {
    state.isRefreshing = isRefreshing;
  },

  ADD_REFRESH_SUBSCRIBER(state, callback) {
    state.refreshSubscribers.push(callback);
  },

  CLEAR_SUBSCRIBERS(state) {
    state.refreshSubscribers = [];
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
