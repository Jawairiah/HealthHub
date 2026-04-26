// medicare-frontend/src/App.jsx - UPDATED WITH DOCTOR ROUTES
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import './styles.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppointmentProvider } from './context/AppointmentContext';
import { NotificationProvider } from './context/NotificationContext';
import { UINotificationsProvider } from './context/UINotifications.jsx';
import UINotificationBell from './components/UINotificationBell.jsx';
import NotificationToast from './components/NotificationToast.jsx';

import RoleSelect from './pages/RoleSelect';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import Search from './pages/Search.jsx';
import DoctorProfile from './pages/DoctorProfile.jsx';
import Landing from './pages/Landing.jsx';
import AuthPortal from './pages/AuthPortal.jsx';
import { initNotifyGlobal } from './utils/notify.js';

// Import new doctor pages
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorClinicsPage from './pages/doctor/DoctorClinicsPage';
import DoctorAvailabilityPage from './pages/doctor/DoctorAvailabilityPage';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorPastAppointmentsPage from './pages/doctor/DoctorPastAppointmentsPage';

export default function App() {
  initNotifyGlobal();
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppointmentProvider>
          <UINotificationsProvider>
          <BrowserRouter>
            <Shell>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth" element={<AuthPortal />} />
                
                {/* Patient routes */}
                <Route path="/patient" element={<RequireRole role="patient"><PatientDashboard /></RequireRole>} />
                <Route path="/search" element={<Search />} />
                <Route path="/doctor/:id" element={<DoctorProfile />} />
                
                {/* Doctor routes */}
                <Route path="/doctor" element={<RequireRole role="doctor"><DoctorDashboard /></RequireRole>} />
                <Route path="/doctor/profile" element={<RequireRole role="doctor"><DoctorProfilePage /></RequireRole>} />
                <Route path="/doctor/my-clinics" element={<RequireRole role="doctor"><DoctorClinicsPage /></RequireRole>} />
                <Route path="/doctor/add-availability" element={<RequireRole role="doctor"><DoctorAvailabilityPage /></RequireRole>} />
                <Route path="/doctor/my-appointments" element={<RequireRole role="doctor"><DoctorAppointmentsPage /></RequireRole>} />
                <Route path="/doctor/past-appointments" element={<RequireRole role="doctor"><DoctorPastAppointmentsPage /></RequireRole>} />
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
            <NotificationToast />
          </BrowserRouter>
          </UINotificationsProvider>
        </AppointmentProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

function Shell({ children }) {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  React.useEffect(() => {
    // Only show notifications if user is authenticated
    if (!user || loading) return;
    
    const p = location.pathname;
    if (p.startsWith('/patient')) {
      try { window.notify({ title: 'Welcome back', message: 'Patient dashboard loaded.', type: 'info' }); } catch {}
    }
    if (p.startsWith('/doctor')) {
      try { window.notify({ title: 'Welcome back', message: 'Doctor dashboard loaded.', type: 'info' }); } catch {}
    }
  }, [location.pathname, user, loading]);
  
  return (
    <div>
      <header className="header">
        <div className="brand">
          <img src="/src/assets/logo.svg" alt="Medicare logo" />
          <Link className="link name" to={"/"}>Medicare</Link>
        </div>
        <nav className="nav">
          {isHome ? (
            <>
              <Link className="link" to={"/auth?tab=login"}>Sign in</Link>
              <Link className="btn" to={"/auth?tab=signup"}>Get Started</Link>
            </>
          ) : (
            <>
              {user && user.email && (
                <UINotificationBell />
              )}
              {user ? (
                <>
                  {(window?.localStorage?.getItem('medicare_role') === 'patient') && (
                    <Link className="link" to={"/search"}>Find Doctors</Link>
                  )}
                  <Link className="link" to={user.role === 'patient' ? '/patient' : '/doctor'}>Dashboard</Link>
                  <button className="btn ghost" onClick={logout}>Logout</button>
                </>
              ) : (
                <>
                  <Link className="link" to={"/login"}>Sign In</Link>
                  <Link className="btn" to={"/signup"}>Create Account</Link>
                </>
              )}
            </>
          )}
        </nav>
      </header>
      <main className="container">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Medicare</footer>
    </div>
  );
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={role === 'patient' ? '/patient' : '/doctor'} replace />;
  return children;
}