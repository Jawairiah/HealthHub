// medicare-frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is already logged in
        const persistedRole = localStorage.getItem('medicare_role');
        const token = localStorage.getItem('mc_access');
        
        if (persistedRole) {
          setSelectedRole(persistedRole);
        }
        
        // Only try to load profile if we have a token
        if (token) {
          await loadUserProfile(persistedRole);
        } else {
          // No token, just set loading to false
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loadUserProfile = async (role) => {
    try {
      let response;
      
      if (role === 'doctor') {
        response = await api.getDoctorProfile();
      } else if (role === 'patient') {
        response = await api.getPatientProfile();
      } else {
        // No role specified, can't load profile
        setLoading(false);
        return;
      }

      if (response.ok) {
        setUser({ ...response.data, role });
        setIsAuthenticated(true);
        setSelectedRole(role);
      } else {
        // Token invalid or profile not found, clear everything
        api.logout();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Don't clear tokens on network errors, just log out
      api.logout();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role) => {
    setSelectedRole(role);
    localStorage.setItem('medicare_role', role);
  };

  const login = async ({ email, password }) => {
    if (!selectedRole) {
      return { ok: false, error: 'Please select a role first' };
    }

    try {
      const response = await api.login({ 
        email, 
        password, 
        role: selectedRole 
      });

      if (response.ok && response.data?.user) {
        const userData = { ...response.data.user, role: selectedRole };
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('medicare_auth', 'true');
        localStorage.setItem('medicare_role', selectedRole);

        // Fetch and show notifications
        try {
          const notifResponse = await api.getNotifications();
          if (notifResponse.ok && Array.isArray(notifResponse.data)) {
            const unread = notifResponse.data.filter(n => !n.read);
            unread.forEach(n => {
              const actionType = n.notification_type || 'Notification';
              const message = n.message || `${actionType} notification`;
              try { 
                window.notify({ 
                  title: n.title || actionType, 
                  message, 
                  type: 'info', 
                  meta: n.meta || {} 
                }); 
              } catch {}
            });
          }
        } catch (notifError) {
          console.error('Failed to load notifications:', notifError);
        }

        return { ok: true, user: userData };
      }

      return { 
        ok: false, 
        error: response.data?.detail || response.data?.error || 'Invalid credentials' 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        ok: false, 
        error: 'Login failed. Please check your credentials and try again.' 
      };
    }
  };

  const signup = async (payload) => {
    if (!selectedRole && !payload.role) {
      return { ok: false, error: 'Please select a role first' };
    }

    try {
      // Prepare signup payload based on role
      const role = payload.role || selectedRole;
      const signupData = {
        role,
        email: payload.email,
        password: payload.password,
        first_name: payload.name?.split(' ')[0] || payload.first_name || '',
        last_name: payload.name?.split(' ').slice(1).join(' ') || payload.last_name || '',
      };

      // Add role-specific fields
      if (role === 'patient') {
        if (payload.profile) {
          signupData.date_of_birth = payload.profile.date_of_birth || null;
          signupData.gender = payload.profile.gender || '';
          signupData.phone = payload.profile.phone || '';
          signupData.address = payload.profile.address || '';
        }
      } else if (role === 'doctor') {
        if (payload.profile) {
          signupData.specialization = payload.profile.specialization || '';
          signupData.qualification = payload.profile.qualification || '';
          signupData.experience_years = payload.profile.experience_years || 0;
          signupData.consultation_fee = payload.profile.consultation_fee || null;
        }
      }

      const response = await api.signup(signupData);

      if (response.ok) {
        return { ok: true };
      }

      return { 
        ok: false, 
        error: response.data?.error || response.data?.detail || 'Signup failed' 
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        ok: false, 
        error: 'Signup failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedRole(null);
  };

  const value = useMemo(() => ({
    selectedRole,
    isAuthenticated,
    user,
    loading,
    selectRole,
    login,
    signup,
    logout,
  }), [selectedRole, isAuthenticated, user, loading]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { AuthContext };