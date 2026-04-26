// medicare-frontend/src/pages/doctor/DoctorProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../lib/api';

export default function DoctorProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialization: '',
    qualification: '',
    experience_years: '',
    consultation_fee: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getDoctorProfile();
      
      if (response.ok) {
        setProfile(response.data);
        setFormData({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          email: response.data.email || '',
          specialization: response.data.specialization || '',
          qualification: response.data.qualification || '',
          experience_years: response.data.experience_years || '',
          consultation_fee: response.data.consultation_fee || '',
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Profile load error:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await api.updateDoctorProfile(formData);
      
      if (response.ok) {
        setSuccess('Profile updated successfully');
        setEditing(false);
        await loadProfile();
        
        try {
          window.notify({
            title: 'Profile Updated',
            message: 'Your profile has been updated successfully',
            type: 'success',
          });
        } catch {}
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>My Profile</h1>
            <p className="subtitle">View and update your professional information</p>
          </div>
          <button
            onClick={() => navigate('/doctor')}
            className="btn ghost"
          >
            ← Back to Dashboard
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
        {!editing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Profile Information</h3>
              <button onClick={() => setEditing(true)} className="btn">
                ✏️ Edit Profile
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="grid">
                <div>
                  <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    First Name
                  </label>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {profile?.first_name || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Last Name
                  </label>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {profile?.last_name || 'Not set'}
                  </div>
                </div>
              </div>

              <div>
                <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  {profile?.email || 'Not set'}
                </div>
              </div>

              <div>
                <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Specialization
                </label>
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  {profile?.specialization || 'Not set'}
                </div>
              </div>

              <div className="grid">
                <div>
                  <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Qualification
                  </label>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {profile?.qualification || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Experience (years)
                  </label>
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {profile?.experience_years ?? 'Not set'}
                  </div>
                </div>
              </div>

              <div>
                <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Default Consultation Fee (PKR)
                </label>
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  {profile?.consultation_fee ? `PKR ${profile.consultation_fee}` : 'Not set'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Edit Profile</h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  loadProfile();
                }}
                className="btn ghost"
              >
                Cancel
              </button>
            </div>

            <div className="stack">
              <div className="grid">
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    First Name *
                  </label>
                  <input
                    className="input"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Last Name *
                  </label>
                  <input
                    className="input"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Email *
                </label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Specialization
                </label>
                <input
                  className="input"
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Cardiologist, Dermatologist"
                />
              </div>

              <div className="grid">
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Qualification
                  </label>
                  <input
                    className="input"
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g., MBBS, MD"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Experience (years)
                  </label>
                  <input
                    className="input"
                    type="number"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                    min="0"
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Default Consultation Fee (PKR)
                </label>
                <input
                  className="input"
                  type="number"
                  name="consultation_fee"
                  value={formData.consultation_fee}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="1500"
                />
              </div>

              <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
                💾 Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}