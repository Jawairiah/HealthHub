// medicare-frontend/src/pages/doctor/DoctorAvailabilityPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../lib/api';

export default function DoctorAvailabilityPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    doctor_clinic_id: '',
    date: '',
    start_time: '',
    end_time: '',
    slot_duration: '30',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const response = await api.getDoctorClinics();

      if (response.ok) {
        setClinics(response.data);
      } else {
        setError('Failed to load clinics');
      }
    } catch (err) {
      console.error('Failed to load clinics:', err);
      setError('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.doctor_clinic_id) {
      setError('Please select a clinic');
      return;
    }

    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError('Cannot set availability for past dates');
      return;
    }

    // Validate time range
    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time');
      return;
    }

    try {
      const response = await api.addDoctorAvailability({
        doctor_clinic_id: parseInt(formData.doctor_clinic_id),
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        slot_duration: parseInt(formData.slot_duration),
      });

      if (response.ok) {
        setSuccess('Availability added successfully');
        
        try {
          window.notify({
            title: 'Availability Added',
            message: 'Your availability has been set successfully',
            type: 'success',
          });
        } catch {}

        // Reset form
        setFormData({
          doctor_clinic_id: formData.doctor_clinic_id,
          date: '',
          start_time: '',
          end_time: '',
          slot_duration: '30',
        });
      } else {
        setError(response.error || 'Failed to add availability');
      }
    } catch (err) {
      console.error('Add availability error:', err);
      setError('Failed to add availability');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="container">
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Add Availability</h1>
            <button onClick={() => navigate('/doctor')} className="btn ghost">
              ← Back
            </button>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No clinics found</h3>
          <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
            You need to add at least one clinic before setting availability
          </p>
          <button onClick={() => navigate('/doctor/my-clinics')} className="btn">
            Go to My Clinics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Add Availability</h1>
            <p className="subtitle">Set your available time slots for appointments</p>
          </div>
          <button onClick={() => navigate('/doctor')} className="btn ghost">
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          borderColor: '#ef4444' 
        }}>
          <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          background: '#d1fae5', 
          borderColor: '#10b981' 
        }}>
          <p style={{ color: '#065f46', margin: 0 }}>{success}</p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Availability Details</h3>

        <form onSubmit={handleSubmit}>
          <div className="stack">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Clinic *
              </label>
              <select
                className="select"
                name="doctor_clinic_id"
                value={formData.doctor_clinic_id}
                onChange={handleChange}
                required
              >
                <option value="">Choose a clinic...</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.clinic_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Date *
              </label>
              <input
                className="input"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Start Time *
                </label>
                <input
                  className="input"
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  End Time *
                </label>
                <input
                  className="input"
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Slot Duration (minutes) *
              </label>
              <select
                className="select"
                name="slot_duration"
                value={formData.slot_duration}
                onChange={handleChange}
                required
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div className="card" style={{ background: '#eff6ff', borderColor: '#3b82f6' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
                <strong>ℹ️ Note:</strong> Setting availability will create bookable time slots 
                for patients based on your slot duration. Make sure no appointments exist in 
                this time range before updating.
              </p>
            </div>

            <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
              ✅ Add Availability
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}