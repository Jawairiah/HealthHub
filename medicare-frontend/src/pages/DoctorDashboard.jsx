// medicare-frontend/src/pages/DoctorDashboard.jsx - ENHANCED VERSION
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    clinics: [],
    appointments: [],
    pastAppointments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [clinicsRes, appointmentsRes, pastRes] = await Promise.all([
        api.getDoctorClinics(),
        api.getDoctorAppointments(),
        api.getDoctorPastAppointments()
      ]);

      setState(prev => ({
        ...prev,
        clinics: clinicsRes.ok ? clinicsRes.data : [],
        appointments: appointmentsRes.ok ? appointmentsRes.data : [],
        pastAppointments: pastRes.ok ? pastRes.data : [],
        loading: false,
        error: null,
      }));
    } catch (err) {
      console.error('Dashboard load error:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to load dashboard data',
        loading: false,
      }));
    }
  };

  const stats = {
    clinics: state.clinics.length,
    upcoming: state.appointments.length,
    completed: state.pastAppointments.filter(a => a.status === 'completed').length,
    completionRate: state.pastAppointments.length > 0
      ? Math.round((state.pastAppointments.filter(a => a.status === 'completed').length / state.pastAppointments.length) * 100)
      : 0
  };

  if (state.loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>
          Welcome back, Dr. {user?.last_name || user?.first_name} 👋
        </h1>
        <p className="subtitle">Manage your practice and appointments</p>
      </div>

      {/* Error Alert */}
      {state.error && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          borderColor: '#ef4444' 
        }}>
          <p style={{ color: '#991b1b', margin: 0 }}>{state.error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #667eea' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>
            {stats.upcoming}
          </div>
          <div className="subtitle">Upcoming Appointments</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
            {stats.completed}
          </div>
          <div className="subtitle">Completed</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
            {stats.clinics}
          </div>
          <div className="subtitle">My Clinics</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6' }}>
            {stats.completionRate}%
          </div>
          <div className="subtitle">Completion Rate</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          <Link to="/doctor/profile" className="btn outline" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>👤</span>
            My Profile
          </Link>
          <Link to="/doctor/my-clinics" className="btn outline" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🏥</span>
            My Clinics
          </Link>
          <Link to="/doctor/add-availability" className="btn outline" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📅</span>
            Add Availability
          </Link>
          <Link to="/doctor/my-appointments" className="btn outline" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📋</span>
            My Appointments
          </Link>
          <Link to="/doctor/past-appointments" className="btn outline" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📊</span>
            Past Appointments
          </Link>
        </div>
      </div>

      {/* My Clinics Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>My Clinics</h3>
          <Link to="/doctor/my-clinics" className="btn ghost">
            View All →
          </Link>
        </div>

        {state.clinics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
            <p>No clinics added yet</p>
            <Link to="/doctor/my-clinics" className="btn" style={{ marginTop: '1rem', textDecoration: 'none' }}>
              + Add Your First Clinic
            </Link>
          </div>
        ) : (
          <div className="grid">
            {state.clinics.slice(0, 4).map(clinic => (
              <div key={clinic.id} className="card" style={{ padding: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
                  {clinic.clinic_name}
                </h4>
                <p className="subtitle" style={{ fontSize: '0.85rem' }}>
                  📍 {clinic.clinic_address}
                </p>
                <p style={{ fontWeight: '600', color: '#667eea', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Fee: PKR {clinic.consultation_fee || 'Not set'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Appointments */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Recent Appointments</h3>
          <Link to="/doctor/my-appointments" className="btn ghost">
            View All →
          </Link>
        </div>

        {state.appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <p>No upcoming appointments</p>
          </div>
        ) : (
          <div className="stack">
            {state.appointments.slice(0, 5).map(appt => (
              <div key={appt.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>
                      {appt.patient_name}
                    </h4>
                    <p className="subtitle" style={{ fontSize: '0.85rem' }}>
                      📍 {appt.clinic_name}
                    </p>
                    <p className="subtitle" style={{ fontSize: '0.85rem' }}>
                      📅 {new Date(appt.scheduled_time).toLocaleDateString()} at{' '}
                      {new Date(appt.scheduled_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span 
                    className="badge"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem'
                    }}
                  >
                    {appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}