// medicare-frontend/src/context/AppointmentContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';


const AppointmentContext = createContext(null);

export function AppointmentProvider({ children }) {
  const { user, selectedRole } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load doctors when component mounts or role changes
  useEffect(() => {
    if (selectedRole === 'patient') {
      loadDoctors();
    }
  }, [selectedRole]);

  // Load appointments when user logs in
  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const loadDoctors = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await api.getDoctors(filters);
      if (response.ok) {
        // Handle both array and object with results property
        const doctorsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        setDoctors(doctorsList);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      if (selectedRole === 'patient') {
        const [currentRes, pastRes] = await Promise.all([
          api.getMyAppointments(),
          api.getPastAppointments(),
        ]);
        
        if (currentRes.ok) {
          setAppointments(currentRes.data || []);
        }
        if (pastRes.ok) {
          setPastAppointments(pastRes.data || []);
        }
      } else if (selectedRole === 'doctor') {
        const [currentRes, pastRes] = await Promise.all([
          api.getDoctorAppointments(),
          api.getDoctorPastAppointments(),
        ]);
        
        if (currentRes.ok) {
          setAppointments(currentRes.data || []);
        }
        if (pastRes.ok) {
          setPastAppointments(pastRes.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const searchDoctors = async (filters) => {
    await loadDoctors(filters);
    return doctors;
  };

  const getSlotsForDate = async (doctorId, clinicId, dateStr) => {
    try {
      const response = await api.getDoctorSlots(doctorId, clinicId, dateStr);
      if (response.ok) {
        return response.data.slots || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get slots:', error);
      return [];
    }
  };

  const bookAppointment = async (doctorId, clinicId, scheduledTime, notes = '') => {
    try {
      const response = await api.createAppointment({
        doctor_id: doctorId,
        clinic_id: clinicId,
        scheduled_time: scheduledTime,
        notes,
      });

      if (response.ok) {
        // Reload appointments
        await loadAppointments();
        
        // Show success notification
        try {
          window.notify({
            title: 'Appointment Booked',
            message: 'Your appointment has been successfully booked',
            type: 'success',
          });
        } catch {}

        return { ok: true, data: response.data };
      }

      return { 
        ok: false, 
        error: response.data?.error || 'Failed to book appointment' 
      };
    } catch (error) {
      console.error('Failed to book appointment:', error);
      return { 
        ok: false, 
        error: 'Failed to book appointment. Please try again.' 
      };
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const response = await api.cancelAppointment(appointmentId);
      
      if (response.ok) {
        // Reload appointments
        await loadAppointments();
        
        // Show notification
        try {
          window.notify({
            title: 'Appointment Cancelled',
            message: 'Your appointment has been cancelled',
            type: 'warn',
          });
        } catch {}

        return { ok: true };
      }

      return { 
        ok: false, 
        error: response.data?.error || 'Failed to cancel appointment' 
      };
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      return { 
        ok: false, 
        error: 'Failed to cancel appointment. Please try again.' 
      };
    }
  };

  const myAppointments = useMemo(() => {
    return appointments || [];
  }, [appointments]);

  const analytics = useMemo(() => {
    const total = appointments.length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const booked = appointments.filter(a => a.status === 'booked').length;
    const completed = pastAppointments.filter(a => a.status === 'completed').length;
    
    return {
      total,
      booked,
      cancelled,
      completed,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  }, [appointments, pastAppointments]);

  const value = {
    doctors,
    appointments,
    pastAppointments,
    myAppointments,
    analytics,
    loading,
    searchDoctors,
    getSlotsForDate,
    bookAppointment,
    cancelAppointment,
    loadDoctors,
    loadAppointments,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used within AppointmentProvider');
  }
  return context;
}