// medicare-frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medicare_access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('medicare_refresh');
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('medicare_access', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API responses
const handleResponse = async (apiCall) => {
  try {
    const response = await apiCall;
    return { ok: true, data: response.data };
  } catch (error) {
    console.error('API Error:', error);
    return {
      ok: false,
      error: error.response?.data?.detail || error.response?.data?.error || error.message,
      data: error.response?.data,
    };
  }
};

// Auth APIs
export const login = (credentials) =>
  handleResponse(apiClient.post('/api/auth/login/', credentials));

export const signup = (userData) =>
  handleResponse(apiClient.post('/api/auth/register/', userData));

export const logout = () => {
  localStorage.removeItem('medicare_access');
  localStorage.removeItem('medicare_refresh');
  localStorage.removeItem('medicare_role');
  localStorage.removeItem('medicare_auth');
  window.location.href = '/';
};

// Doctor APIs
export const getDoctorProfile = () =>
  handleResponse(apiClient.get('/api/doctors/profile/'));

export const updateDoctorProfile = (data) =>
  handleResponse(apiClient.put('/api/doctors/profile/', data));

export const getDoctorClinics = () =>
  handleResponse(apiClient.get('/api/doctors/my-clinics/'));

export const addDoctorClinic = (clinicData) =>
  handleResponse(apiClient.post('/api/doctors/add-clinic/', clinicData));

export const removeDoctorClinic = (clinicId) =>
  handleResponse(apiClient.delete(`/api/doctors/remove-clinic/${clinicId}/`));

export const addDoctorAvailability = (availabilityData) =>
  handleResponse(apiClient.post('/api/doctors/add-availability/', availabilityData));

export const getDoctorAppointments = () =>
  handleResponse(apiClient.get('/api/doctors/my-appointments/'));

export const getDoctorPastAppointments = () =>
  handleResponse(apiClient.get('/api/doctors/past-appointments/'));

// Patient APIs
export const getPatientProfile = () =>
  handleResponse(apiClient.get('/api/patient/profile/'));

export const updatePatientProfile = (data) =>
  handleResponse(apiClient.put('/api/patient/profile/', data));

export const getDoctors = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.name) params.append('name', filters.name);
  if (filters.specialization) params.append('specialization', filters.specialization);
  if (filters.clinic_name) params.append('clinic_name', filters.clinic_name);
  
  const queryString = params.toString();
  const url = queryString ? `/api/patient/doctors/?${queryString}` : '/api/patient/doctors/';
  
  return handleResponse(apiClient.get(url));
};

export const getDoctorById = (doctorId) =>
  handleResponse(apiClient.get(`/api/patient/doctors/${doctorId}/`));

export const getDoctorSlots = (doctorId, clinicId, date) =>
  handleResponse(
    apiClient.get('/api/patient/doctor-availability/', {
      params: { doctor_id: doctorId, clinic_id: clinicId, date },
    })
  );

export const createAppointment = (appointmentData) =>
  handleResponse(apiClient.post('/api/patient/book-appointment/', appointmentData));

export const getMyAppointments = () =>
  handleResponse(apiClient.get('/api/patient/my-appointments/'));

export const getPastAppointments = () =>
  handleResponse(apiClient.get('/api/patient/past-appointments/'));

export const cancelAppointment = (appointmentId) =>
  handleResponse(apiClient.post(`/api/patient/cancel-appointment/${appointmentId}/`));

// Notification APIs
export const getNotifications = () =>
  handleResponse(apiClient.get('/api/notifications/'));

export const markNotificationRead = (notificationId) =>
  handleResponse(apiClient.post(`/api/notifications/${notificationId}/read/`));

export const markAllNotificationsRead = () =>
  handleResponse(apiClient.post('/api/notifications/mark-all-read/'));

export const deleteNotification = (notificationId) =>
  handleResponse(apiClient.delete(`/api/notifications/${notificationId}/delete/`));

export const clearAllNotifications = () =>
  handleResponse(apiClient.post('/api/notifications/clear-all/'));

export const getUnreadCount = () =>
  handleResponse(apiClient.get('/api/notifications/unread-count/'));

export default apiClient;