// medicare-frontend/src/pages/doctor/DoctorDashboard.jsx

import React, { useContext, useEffect, useState } from "react";
import * as api from "../../lib/api";
import { AuthContext } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function DoctorDashboard() {
  const { user } = useContext(AuthContext);
  const [clinics, setClinics] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load all data in parallel
        const [clinicsRes, appointmentsRes, pastRes] = await Promise.all([
          api.get("/api/doctors/my-clinics/"),
          api.get("/api/doctors/my-appointments/"),
          api.get("/api/doctors/past-appointments/")
        ]);
        
        setClinics(clinicsRes.data);
        setAppointments(appointmentsRes.data);
        setPastAppointments(pastRes.data);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(err.response?.data || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Calculate statistics
  const upcomingCount = appointments.length;
  const completedCount = pastAppointments.filter(a => a.status === 'completed').length;
  const completionRate = pastAppointments.length > 0 
    ? Math.round((completedCount / pastAppointments.length) * 100) 
    : 0;

  return (
    <div className="container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, Dr. {user?.last_name || user?.first_name} 👋</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            You are logged in as a <strong>Doctor</strong>
          </p>
        </div>
      </div>

      {loading && <div className="loading">Loading your dashboard</div>}
      {error && <div className="error">{JSON.stringify(error)}</div>}

      {!loading && (
        <>
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{upcomingCount}</span>
              <span className="stat-label">Upcoming</span>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Scheduled appointments
              </p>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
              <span className="stat-value" style={{ color: '#10b981' }}>
                {completedCount}
              </span>
              <span className="stat-label">Completed</span>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Successfully completed
              </p>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
              <span className="stat-value" style={{ color: '#f59e0b' }}>
                {clinics.length}
              </span>
              <span className="stat-label">Clinics</span>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Where you practice
              </p>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
              <span className="stat-value" style={{ color: '#8b5cf6' }}>
                {completionRate}%
              </span>
              <span className="stat-label">Completion Rate</span>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Currently completed
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
            <div className="quick-actions">
              <Link to="/doctor/profile" className="action-btn">
                📋 View My Profile
              </Link>
              <Link to="/doctor/appointments" className="action-btn">
                📅 View My Appointments
              </Link>
              <Link to="/doctor/past-appointments" className="action-btn">
                📊 Past Appointments
              </Link>
              {clinics.length > 0 && (
                <Link 
                  to={`/doctor/clinic/${clinics[0].clinic_id}`} 
                  className="action-btn"
                >
                  🏥 Manage Clinic
                </Link>
              )}
            </div>
          </div>

          {/* My Clinics */}
          <div className="card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem' 
            }}>
              <h3>My Clinics</h3>
              <Link to="/doctor/add-clinic" className="action-btn">
                + Add Clinic
              </Link>
            </div>

            {clinics.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem', 
                color: '#6b7280' 
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
                <p>No clinics linked yet</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Add your first clinic to get started
                </p>
              </div>
            ) : (
              <div className="grid">
                {clinics.map((dc) => (
                  <div key={dc.id} className="clinic-card">
                    <h3>{dc.clinic_name}</h3>
                    <p>📍 {dc.clinic_address}</p>
                    <p>📞 {dc.clinic_phone}</p>
                    {dc.clinic_email && <p>✉️ {dc.clinic_email}</p>}
                    <p style={{ 
                      fontWeight: '600', 
                      color: '#667eea', 
                      marginTop: '0.75rem' 
                    }}>
                      Fee: PKR {dc.consultation_fee || "Not set"}
                    </p>
                    <Link 
                      to={`/doctor/clinic/${dc.clinic_id}`}
                      style={{
                        display: 'inline-block',
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: '#667eea',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#5568d3';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#667eea';
                      }}
                    >
                      Manage Clinic →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity / Upcoming Appointments */}
          <div className="card">
            <h3>Recent Activity</h3>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '0.9rem', 
              marginBottom: '1rem' 
            }}>
              Your latest interactions
            </p>
            
            {appointments.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6b7280' 
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p>No recent activity to display</p>
              </div>
            ) : (
              <div className="appointment-list">
                {appointments.slice(0, 5).map((appt) => (
                  <div key={appt.id} className="appointment-item">
                    <div className="appointment-info">
                      <h4>{appt.patient_name}</h4>
                      <p>📍 {appt.clinic_name}</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {appt.notes || 'No notes provided'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="appointment-time">
                        {new Date(appt.scheduled_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        <br />
                        {new Date(appt.scheduled_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <span 
                        className={`status-badge status-${appt.status}`} 
                        style={{ marginTop: '0.5rem', display: 'inline-block' }}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {appointments.length > 5 && (
              <div style={{ 
                marginTop: '1rem', 
                textAlign: 'center' 
              }}>
                <Link 
                  to="/doctor/appointments" 
                  className="action-btn"
                >
                  View All Appointments →
                </Link>
              </div>
            )}
          </div>

          {/* Past Appointments Summary */}
          {pastAppointments.length > 0 && (
            <div className="card">
              <h3>Recent Completed Appointments</h3>
              <div className="appointment-list">
                {pastAppointments.slice(0, 3).map((appt) => (
                  <div key={appt.id} className="appointment-item">
                    <div className="appointment-info">
                      <h4>{appt.patient_name}</h4>
                      <p>📍 {appt.clinic_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#6b7280' 
                      }}>
                        {new Date(appt.completed_at).toLocaleDateString()}
                      </div>
                      <span 
                        className={`status-badge status-${appt.status}`}
                        style={{ marginTop: '0.25rem', display: 'inline-block' }}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}