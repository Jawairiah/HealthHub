// medicare-frontend/src/pages/patient/PatientDashboard.jsx
// COMPLETELY RECODED PATIENT DASHBOARD

import React, { useEffect, useState, useContext } from "react";
import * as api from "../../lib/api";
import { AuthContext } from "../../context/AuthContext";

export default function PatientDashboard() {
  const { user } = useContext(AuthContext);
  
  // State management
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

      const [doctorsResponse, appointmentsResponse, pastResponse] = await Promise.all([
        api.get("/api/patient/doctors/"),
        api.get("/api/patient/my-appointments/"),
        api.get("/api/patient/past-appointments/").catch(() => ({ data: [] }))
      ]);

      setState(prev => ({
        ...prev,
        doctors: doctorsResponse.data.results || doctorsResponse.data || [],
        myAppointments: appointmentsResponse.data || [],
        pastAppointments: pastResponse.data || [],
        loading: false,
      }));
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || "Failed to load dashboard data",
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

    // Scroll to booking section
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

      const response = await api.get("/api/patient/doctor-availability/", {
        params: {
          doctor_id: selectedDoctor.id,
          clinic_id: selectedClinic.clinic_id,
          date: selectedDate,
        },
      });

      const slots = response.data.slots || [];

      setBooking(prev => ({
        ...prev,
        availableSlots: slots,
        isLoadingSlots: false,
        bookingError: slots.length === 0 ? "No available slots for this date" : null,
      }));
    } catch (error) {
      console.error("Failed to fetch slots:", error);
      setBooking(prev => ({
        ...prev,
        availableSlots: [],
        isLoadingSlots: false,
        bookingError: error.response?.data?.error || "Failed to load available slots",
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

      await api.post("/api/patient/book-appointment/", {
        doctor_id: selectedDoctor.id,
        clinic_id: selectedClinic.clinic_id,
        scheduled_time: `${selectedDate}T${timeSlot}`,
        notes: "",
      });

      alert("✅ Appointment booked successfully!");

      // Reset booking state and reload data
      setBooking({
        selectedDoctor: null,
        selectedClinic: null,
        selectedDate: "",
        availableSlots: [],
        isLoadingSlots: false,
        bookingError: null,
      });

      await loadDashboardData();

      // Scroll to appointments
      document.getElementById('my-appointments')?.scrollIntoView({
        behavior: 'smooth'
      });
    } catch (error) {
      console.error("Failed to book appointment:", error);
      setBooking(prev => ({
        ...prev,
        isLoadingSlots: false,
        bookingError: error.response?.data?.error || "Failed to book appointment",
      }));
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      await api.post(`/api/patient/cancel-appointment/${appointmentId}/`);
      alert("Appointment cancelled successfully");
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || "Failed to cancel appointment",
      }));
    }
  };

  const handleSearch = (searchValue) => {
    setState(prev => ({ ...prev, searchTerm: searchValue }));
  };

  // Computed values
  const filteredDoctors = state.doctors.filter((doctor) => {
    const searchLower = state.searchTerm.toLowerCase();
    const fullName = `${doctor.first_name} ${doctor.last_name}`.toLowerCase();
    const specialization = (doctor.specialization || "").toLowerCase();
    return fullName.includes(searchLower) || specialization.includes(searchLower);
  });

  const stats = {
    total: state.myAppointments.length,
    upcoming: state.myAppointments.filter((a) => a.status === "booked").length,
    completed: state.pastAppointments.filter((a) => a.status === "completed").length,
    cancelled: state.myAppointments.filter((a) => a.status === "cancelled").length,
  };

  // Render helpers
  const renderStatCard = (value, label, color = "#667eea") => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <span className="stat-value" style={{ color }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );

  const renderAppointmentItem = (appointment, showCancelButton = false) => (
    <div key={appointment.id} className="appointment-item">
      <div className="appointment-info">
        <h4>Dr. {appointment.doctor_name}</h4>
        <p>📍 {appointment.clinic_name}</p>
        {appointment.notes && (
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {appointment.notes}
          </p>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="appointment-time">
          {new Date(appointment.scheduled_time).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          <br />
          {new Date(appointment.scheduled_time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <span
          className={`status-badge status-${appointment.status}`}
          style={{ marginTop: "0.5rem", display: "inline-block" }}
        >
          {appointment.status}
        </span>
        {showCancelButton && appointment.status === "booked" && (
          <button
            onClick={() => cancelAppointment(appointment.id)}
            style={{
              marginTop: "0.5rem",
              padding: "0.25rem 0.75rem",
              background: "#fee2e2",
              color: "#991b1b",
              border: "none",
              borderRadius: "4px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "block",
              width: "100%",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderDoctorCard = (doctor) => (
    <div key={doctor.id} className="doctor-card">
      <div style={{ marginBottom: "1rem" }}>
        <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
        <div className="doctor-specialization">
          {doctor.specialization || "General Practitioner"}
        </div>
      </div>
      <p>🎓 {doctor.qualification || "MBBS"}</p>
      <p>📅 {doctor.experience_years || 0} years experience</p>
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Available at {doctor.clinics?.length || 0} clinic(s)
      </p>
      <button
        onClick={() => handleDoctorSelect(doctor)}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "0.75rem",
          background: booking.selectedDoctor?.id === doctor.id ? "#10b981" : "#667eea",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.3s",
        }}
      >
        {booking.selectedDoctor?.id === doctor.id ? "✓ Selected" : "Select Doctor"}
      </button>
    </div>
  );

  const renderTimeSlot = (slot) => (
    <button
      key={slot}
      onClick={() => bookAppointment(slot)}
      disabled={booking.isLoadingSlots}
      style={{
        padding: "0.875rem",
        background: "white",
        border: "2px solid #667eea",
        borderRadius: "8px",
        color: "#667eea",
        fontWeight: "600",
        cursor: booking.isLoadingSlots ? "not-allowed" : "pointer",
        transition: "all 0.3s",
        fontSize: "0.95rem",
        opacity: booking.isLoadingSlots ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!booking.isLoadingSlots) {
          e.target.style.background = "#667eea";
          e.target.style.color = "white";
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "white";
        e.target.style.color = "#667eea";
      }}
    >
      {slot}
    </button>
  );

  // Loading state
  if (state.loading) {
    return (
      <div className="container">
        <div className="loading">Loading your dashboard</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user?.first_name} {user?.last_name} 👋</h1>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            Manage your appointments and find doctors
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <div className="error" style={{ marginBottom: "1.5rem" }}>
          {state.error}
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            style={{
              marginLeft: "1rem",
              padding: "0.25rem 0.75rem",
              background: "transparent",
              border: "1px solid currentColor",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="stats-grid">
        {renderStatCard(stats.total, "Total Appointments")}
        {renderStatCard(stats.upcoming, "Upcoming", "#10b981")}
        {renderStatCard(stats.completed, "Completed", "#f59e0b")}
        {renderStatCard(stats.cancelled, "Cancelled", "#ef4444")}
      </div>

      {/* My Appointments */}
      <div id="my-appointments" className="card">
        <h3>My Appointments</h3>
        {state.myAppointments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
            <p>No appointments scheduled yet</p>
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Book your first appointment below
            </p>
          </div>
        ) : (
          <div className="appointment-list">
            {state.myAppointments.map((appt) => renderAppointmentItem(appt, true))}
          </div>
        )}
      </div>

      {/* Find Doctors */}
      <div className="card">
        <h3>Find Specialists</h3>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Search and book appointments with qualified doctors
        </p>

        <input
          type="text"
          placeholder="🔍 Search by name or specialization..."
          value={state.searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ marginBottom: "1.5rem" }}
        />

        {filteredDoctors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            <p>No doctors found matching your search</p>
          </div>
        ) : (
          <div className="grid">
            {filteredDoctors.map(renderDoctorCard)}
          </div>
        )}
      </div>

      {/* Booking Section */}
      {booking.selectedDoctor && (
        <div
          id="booking-section"
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
            border: "2px solid #667eea",
          }}
        >
          <h3>
            Book Appointment with Dr. {booking.selectedDoctor.first_name}{" "}
            {booking.selectedDoctor.last_name}
          </h3>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            {booking.selectedDoctor.specialization} •{" "}
            {booking.selectedDoctor.experience_years} years experience
          </p>

          {/* Booking Error */}
          {booking.bookingError && (
            <div className="error" style={{ marginBottom: "1rem" }}>
              {booking.bookingError}
            </div>
          )}

          {/* Step 1: Select Clinic */}
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "white",
              borderRadius: "8px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "0.75rem",
                fontWeight: "600",
                color: "#374151",
                fontSize: "1rem",
              }}
            >
              Step 1: Select Clinic
            </label>
            <select
              value={booking.selectedClinic?.clinic_id || ""}
              onChange={(e) => {
                const clinic = booking.selectedDoctor.clinics.find(
                  (c) => c.clinic_id === Number(e.target.value)
                );
                handleClinicSelect(clinic);
              }}
              style={{ marginBottom: "0" }}
            >
              <option value="">Choose a clinic...</option>
              {booking.selectedDoctor.clinics?.map((clinic) => (
                <option key={clinic.clinic_id} value={clinic.clinic_id}>
                  {clinic.clinic_name} — Fee: PKR {clinic.consultation_fee || "N/A"}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Date */}
          {booking.selectedClinic && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "white",
                borderRadius: "8px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "0.75rem",
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "1rem",
                }}
              >
                Step 2: Select Date
              </label>
              <input
                type="date"
                value={booking.selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleDateSelect(e.target.value)}
                style={{ marginBottom: "0" }}
              />
            </div>
          )}

          {/* Step 3: Check Availability */}
          {booking.selectedClinic && booking.selectedDate && (
            <button
              onClick={fetchAvailableSlots}
              disabled={booking.isLoadingSlots}
              className="btn-primary"
              style={{
                width: "100%",
                marginBottom: "1.5rem",
                opacity: booking.isLoadingSlots ? 0.7 : 1,
              }}
            >
              {booking.isLoadingSlots ? "🔄 Loading..." : "🔍 Check Available Slots"}
            </button>
          )}

          {/* Step 4: Select Time Slot */}
          {booking.availableSlots.length > 0 && (
            <div
              style={{
                padding: "1rem",
                background: "white",
                borderRadius: "8px",
              }}
            >
              <h4
                style={{
                  marginBottom: "1rem",
                  color: "#374151",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              >
                Step 3: Select Time Slot
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {booking.availableSlots.map(renderTimeSlot)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}