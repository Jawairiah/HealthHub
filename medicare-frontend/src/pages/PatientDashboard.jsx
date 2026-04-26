// medicare-frontend/src/pages/PatientDashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  
  const [state, setState] = useState({
    doctors: [],
    myAppointments: [],
    pastAppointments: [],
    loading: true,
    error: null,
    searchTerm: "",
  });

  const [booking, setBooking] = useState({
    selectedDoctor: null,
    selectedClinic: null,
    selectedDate: "",
    availableSlots: [],
    isLoadingSlots: false,
    bookingError: null,
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Load doctors and appointments
      const [doctorsResponse, appointmentsResponse, pastResponse] = await Promise.all([
        api.getDoctors(),
        api.getMyAppointments(),
        api.getPastAppointments(),
      ]);

      console.log('Doctors Response:', doctorsResponse);
      console.log('Appointments Response:', appointmentsResponse);

      // Handle different response formats
      let doctorsList = [];
      if (doctorsResponse.ok) {
        if (Array.isArray(doctorsResponse.data)) {
          doctorsList = doctorsResponse.data;
        } else if (doctorsResponse.data.results) {
          doctorsList = doctorsResponse.data.results;
        } else if (doctorsResponse.data.count !== undefined) {
          doctorsList = doctorsResponse.data.results || [];
        }
      }

      setState(prev => ({
        ...prev,
        doctors: doctorsList,
        myAppointments: appointmentsResponse.ok ? (appointmentsResponse.data || []) : [],
        pastAppointments: pastResponse.ok ? (pastResponse.data || []) : [],
        loading: false,
        error: doctorsList.length === 0 ? 'No doctors found in the system' : null,
      }));

    } catch (error) {
      console.error('Dashboard load error:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load dashboard data',
        loading: false,
      }));
    }
  };

  const handleDoctorSelect = (doctor) => {
    setBooking({
      selectedDoctor: doctor,
      selectedClinic: null,
      selectedDate: "",
      availableSlots: [],
      isLoadingSlots: false,
      bookingError: null,
    });

    setTimeout(() => {
      document.getElementById('booking-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleClinicSelect = (clinic) => {
    setBooking(prev => ({
      ...prev,
      selectedClinic: clinic,
      selectedDate: "",
      availableSlots: [],
      bookingError: null,
    }));
  };

  const handleDateSelect = (date) => {
    setBooking(prev => ({
      ...prev,
      selectedDate: date,
      availableSlots: [],
      bookingError: null,
    }));
  };

  const fetchAvailableSlots = async () => {
    const { selectedDoctor, selectedClinic, selectedDate } = booking;

    if (!selectedDoctor || !selectedClinic || !selectedDate) {
      setBooking(prev => ({
        ...prev,
        bookingError: "Please select doctor, clinic, and date",
      }));
      return;
    }

    try {
      setBooking(prev => ({
        ...prev,
        isLoadingSlots: true,
        bookingError: null,
      }));

      const response = await api.getDoctorSlots(
        selectedDoctor.id,
        selectedClinic.clinic_id,
        selectedDate
      );

      console.log('Slots Response:', response);

      const slots = response.ok ? (response.data.slots || []) : [];

      setBooking(prev => ({
        ...prev,
        availableSlots: slots,
        isLoadingSlots: false,
        bookingError: slots.length === 0 ? "No available slots for this date" : null,
      }));
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setBooking(prev => ({
        ...prev,
        availableSlots: [],
        isLoadingSlots: false,
        bookingError: 'Failed to load available slots',
      }));
    }
  };

  const bookAppointment = async (timeSlot) => {
    const { selectedDoctor, selectedClinic, selectedDate } = booking;

    if (!confirm(`Confirm appointment with Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} at ${timeSlot}?`)) {
      return;
    }

    try {
      setBooking(prev => ({ ...prev, isLoadingSlots: true }));

      const result = await api.createAppointment({
        doctor_id: selectedDoctor.id,
        clinic_id: selectedClinic.clinic_id,
        scheduled_time: `${selectedDate}T${timeSlot}`,
        notes: "",
      });

      if (result.ok) {
        try {
          window.notify({
            title: 'Appointment Booked',
            message: 'Your appointment has been successfully booked',
            type: 'success',
          });
        } catch {}

        setBooking({
          selectedDoctor: null,
          selectedClinic: null,
          selectedDate: "",
          availableSlots: [],
          isLoadingSlots: false,
          bookingError: null,
        });

        await loadDashboardData();

        document.getElementById('my-appointments')?.scrollIntoView({
          behavior: 'smooth'
        });
      } else {
        setBooking(prev => ({
          ...prev,
          isLoadingSlots: false,
          bookingError: result.error || 'Failed to book appointment',
        }));
      }
    } catch (error) {
      console.error('Failed to book appointment:', error);
      setBooking(prev => ({
        ...prev,
        isLoadingSlots: false,
        bookingError: 'Failed to book appointment',
      }));
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      const result = await api.cancelAppointment(appointmentId);
      
      if (result.ok) {
        try {
          window.notify({
            title: 'Appointment Cancelled',
            message: 'Your appointment has been cancelled',
            type: 'warn',
          });
        } catch {}
        
        await loadDashboardData();
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to cancel appointment',
        }));
      }
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to cancel appointment',
      }));
    }
  };

  const handleSearch = (searchValue) => {
    setState(prev => ({ ...prev, searchTerm: searchValue }));
  };

  // Filter doctors based on search
  const filteredDoctors = state.doctors.filter((doctor) => {
    const searchLower = state.searchTerm.toLowerCase();
    const fullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.toLowerCase();
    const specialization = (doctor.specialization || '').toLowerCase();
    return fullName.includes(searchLower) || specialization.includes(searchLower);
  });

  // Calculate statistics
  const stats = {
    total: state.myAppointments.length,
    upcoming: state.myAppointments.filter((a) => a.status === 'booked').length,
    completed: state.pastAppointments.filter((a) => a.status === 'completed').length,
    cancelled: state.myAppointments.filter((a) => a.status === 'cancelled').length,
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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome, {user?.first_name} {user?.last_name} 👋</h1>
        <p className="subtitle">Manage your appointments and find doctors</p>
      </div>

      {state.error && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          borderColor: '#ef4444' 
        }}>
          <p style={{ color: '#991b1b', margin: 0 }}>{state.error}</p>
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            className="btn"
            style={{ marginTop: '1rem', background: '#991b1b' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #667eea' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>{stats.total}</div>
          <div className="subtitle">Total Appointments</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{stats.upcoming}</div>
          <div className="subtitle">Upcoming</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{stats.completed}</div>
          <div className="subtitle">Completed</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{stats.cancelled}</div>
          <div className="subtitle">Cancelled</div>
        </div>
      </div>

      {/* My Appointments */}
      <div id="my-appointments" className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>My Appointments</h3>
        {state.myAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <p>No appointments scheduled yet</p>
          </div>
        ) : (
          <div className="stack">
            {state.myAppointments.map((appt) => (
              <div key={appt.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Dr. {appt.doctor_name}</h4>
                    <p className="subtitle">📍 {appt.clinic_name}</p>
                    <p className="subtitle">
                      📅 {new Date(appt.scheduled_time).toLocaleString()}
                    </p>
                    {appt.notes && <p className="subtitle">📝 {appt.notes}</p>}
                    <span className="badge">{appt.status}</span>
                  </div>
                  {appt.status === 'booked' && (
                    <button
                      onClick={() => cancelAppointment(appt.id)}
                      className="btn danger"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Find Doctors */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Find Specialists</h3>
        
        <input
          className="input"
          type="text"
          placeholder="🔍 Search by name or specialization..."
          value={state.searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />

        {state.doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍⚕️</div>
            <p><strong>No doctors found in the system</strong></p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Please contact the administrator to add doctors
            </p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <p>No doctors match your search</p>
          </div>
        ) : (
          <div className="grid">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="card">
                <h4 style={{ marginBottom: '0.5rem' }}>
                  Dr. {doctor.first_name} {doctor.last_name}
                </h4>
                <p className="subtitle">
                  {doctor.specialization || 'General Practitioner'}
                </p>
                <p className="subtitle">
                  🎓 {doctor.qualification || 'MBBS'}
                </p>
                <p className="subtitle">
                  📅 {doctor.experience_years || 0} years experience
                </p>
                <p className="subtitle">
                  🏥 {doctor.clinics?.length || 0} clinic(s)
                </p>
                <button
                  onClick={() => handleDoctorSelect(doctor)}
                  className="btn"
                  style={{
                    marginTop: '1rem',
                    width: '100%',
                    background: booking.selectedDoctor?.id === doctor.id ? '#10b981' : undefined,
                  }}
                >
                  {booking.selectedDoctor?.id === doctor.id ? '✓ Selected' : 'Select Doctor'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Section */}
      {booking.selectedDoctor && (
        <div
          id="booking-section"
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            border: '2px solid #667eea',
          }}
        >
          <h3 style={{ marginBottom: '1rem' }}>
            Book Appointment with Dr. {booking.selectedDoctor.first_name}{' '}
            {booking.selectedDoctor.last_name}
          </h3>

          {booking.bookingError && (
            <div className="card" style={{ marginBottom: '1rem', background: '#fee2e2', borderColor: '#ef4444' }}>
              <p style={{ color: '#991b1b', margin: 0 }}>{booking.bookingError}</p>
            </div>
          )}

          {/* Step 1: Select Clinic */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Step 1: Select Clinic
            </label>
            <select
              className="select"
              value={booking.selectedClinic?.clinic_id || ''}
              onChange={(e) => {
                const clinic = booking.selectedDoctor.clinics?.find(
                  (c) => c.clinic_id === Number(e.target.value)
                );
                handleClinicSelect(clinic);
              }}
            >
              <option value="">Choose a clinic...</option>
              {booking.selectedDoctor.clinics?.map((clinic) => (
                <option key={clinic.clinic_id} value={clinic.clinic_id}>
                  {clinic.clinic_name} — Fee: PKR {clinic.consultation_fee || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Date */}
          {booking.selectedClinic && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Step 2: Select Date
              </label>
              <input
                className="input"
                type="date"
                value={booking.selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateSelect(e.target.value)}
              />
            </div>
          )}

          {/* Step 3: Check Availability */}
          {booking.selectedClinic && booking.selectedDate && (
            <button
              onClick={fetchAvailableSlots}
              disabled={booking.isLoadingSlots}
              className="btn"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {booking.isLoadingSlots ? '🔄 Loading...' : '🔍 Check Available Slots'}
            </button>
          )}

          {/* Step 4: Select Time Slot */}
          {booking.availableSlots.length > 0 && (
            <div className="card">
              <h4 style={{ marginBottom: '1rem', fontWeight: '600' }}>
                Step 3: Select Time Slot
              </h4>
              <div className="grid">
                {booking.availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => bookAppointment(slot)}
                    disabled={booking.isLoadingSlots}
                    className="btn outline"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}