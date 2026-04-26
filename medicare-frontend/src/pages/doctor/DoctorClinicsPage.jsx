// medicare-frontend/src/pages/doctor/DoctorClinicsPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../lib/api';

export default function DoctorClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    clinic_id: '',
    consultation_fee: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clinicsRes, allClinicsRes] = await Promise.all([
        api.getDoctorClinics(),
        api.getClinics ? api.getClinics() : Promise.resolve({ ok: true, data: [] })
      ]);

      if (clinicsRes.ok) {
        setClinics(clinicsRes.data);
      }
      if (allClinicsRes.ok) {
        setAllClinics(allClinicsRes.data);
      }
    } catch (err) {
      console.error('Failed to load clinics:', err);
      setError('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClinic = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.clinic_id) {
      setError('Please select a clinic');
      return;
    }

    try {
      const response = await api.addDoctorClinic({
        clinic_id: parseInt(formData.clinic_id),
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
      });

      if (response.ok) {
        try {
          window.notify({
            title: 'Clinic Added',
            message: 'Clinic has been added successfully',
            type: 'success',
          });
        } catch {}

        setShowAddModal(false);
        setFormData({ clinic_id: '', consultation_fee: '' });
        await loadData();
      } else {
        setError(response.error || 'Failed to add clinic');
      }
    } catch (err) {
      console.error('Add clinic error:', err);
      setError('Failed to add clinic');
    }
  };

  const handleRemoveClinic = async (clinicId) => {
    if (!confirm('Are you sure you want to remove this clinic? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.removeDoctorClinic(clinicId);

      if (response.ok) {
        try {
          window.notify({
            title: 'Clinic Removed',
            message: 'Clinic has been removed successfully',
            type: 'warn',
          });
        } catch {}

        await loadData();
      } else {
        setError(response.error || 'Failed to remove clinic');
      }
    } catch (err) {
      console.error('Remove clinic error:', err);
      setError('Failed to remove clinic');
    }
  };

  const availableClinics = allClinics.filter(
    clinic => !clinics.some(dc => dc.clinic_id === clinic.id)
  );

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading clinics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>My Clinics</h1>
            <p className="subtitle">Manage your clinic associations and fees</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowAddModal(true)} className="btn">
              + Add Clinic
            </button>
            <button onClick={() => navigate('/doctor')} className="btn ghost">
              ← Back
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          background: '#fee2e2', 
          borderColor: '#ef4444' 
        }}>
          <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="btn danger"
            style={{ marginTop: '1rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {clinics.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No clinics added yet</h3>
          <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
            Add your first clinic to start managing appointments
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn">
            + Add Your First Clinic
          </button>
        </div>
      ) : (
        <div className="grid">
          {clinics.map(clinic => (
            <div key={clinic.id} className="card">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{clinic.clinic_name}</h3>
                <p className="subtitle">📍 {clinic.clinic_address}</p>
              </div>

              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                <p>📞 {clinic.clinic_phone}</p>
                {clinic.clinic_email && <p>✉️ {clinic.clinic_email}</p>}
                <p style={{ fontWeight: '600', color: '#667eea' }}>
                  Fee: PKR {clinic.consultation_fee || 'Not set'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/doctor/clinic/${clinic.clinic_id}`)}
                  className="btn"
                  style={{ flex: 1 }}
                >
                  Manage
                </button>
                <button
                  onClick={() => handleRemoveClinic(clinic.clinic_id)}
                  className="btn danger"
                  style={{ flex: 1 }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add Clinic</h3>

            <form onSubmit={handleAddClinic}>
              <div className="stack">
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Select Clinic *
                  </label>
                  <select
                    className="select"
                    value={formData.clinic_id}
                    onChange={(e) => setFormData({ ...formData, clinic_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a clinic...</option>
                    {availableClinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} - {clinic.address}
                      </option>
                    ))}
                  </select>
                  {availableClinics.length === 0 && (
                    <p className="subtitle" style={{ marginTop: '0.5rem' }}>
                      All available clinics have been added
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Consultation Fee (PKR)
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="1500"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn" style={{ flex: 1 }}>
                    Add Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({ clinic_id: '', consultation_fee: '' });
                      setError(null);
                    }}
                    className="btn ghost"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}