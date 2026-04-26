// medicare-frontend/src/pages/Signup.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { selectedRole, signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Patient fields
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    // Doctor fields
    specialization: '',
    qualification: '',
    experienceYears: '',
    consultationFee: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const role = selectedRole || 'patient';
    
    // Prepare payload
    const payload = {
      role,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      profile: role === 'patient' ? {
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || '',
        phone: formData.phone || '',
        address: formData.address || '',
      } : {
        specialization: formData.specialization || '',
        qualification: formData.qualification || '',
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
        consultation_fee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
      },
    };

    setLoading(true);
    
    try {
      const result = await signup(payload);
      
      if (result?.ok) {
        // Show success message
        try {
          window.notify({
            title: 'Account Created',
            message: 'Please login with your credentials',
            type: 'success',
          });
        } catch {}
        
        // Navigate to login
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      } else {
        setError(result?.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card stack">
      <h2 className="title">Sign Up</h2>
      <p className="subtitle">Create your {selectedRole || 'account'}</p>
      
      {error && (
        <div className="notif unread" style={{ borderColor: 'var(--danger)', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      
      <form className="stack" onSubmit={onSubmit}>
        {/* Common fields */}
        <input
          className="input"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full Name"
          required
          disabled={loading}
        />
        
        <input
          className="input"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
          disabled={loading}
        />
        
        <input
          className="input"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          disabled={loading}
        />
        
        <input
          className="input"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm Password"
          required
          disabled={loading}
        />

        {/* Patient-specific fields */}
        {selectedRole === 'patient' && (
          <div className="stack">
            <label className="subtitle">Patient Profile (Optional)</label>
            
            <input
              className="input"
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              placeholder="Date of Birth"
              disabled={loading}
            />
            
            <select
              className="input"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            
            <input
              className="input"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              disabled={loading}
            />
            
            <input
              className="input"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              disabled={loading}
            />
          </div>
        )}

        {/* Doctor-specific fields */}
        {selectedRole === 'doctor' && (
          <div className="stack">
            <label className="subtitle">Doctor Profile</label>
            
            <input
              className="input"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              placeholder="Specialization (e.g., Cardiology)"
              required
              disabled={loading}
            />
            
            <input
              className="input"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              placeholder="Qualification (e.g., MBBS, MD)"
              required
              disabled={loading}
            />
            
            <input
              className="input"
              type="number"
              min="0"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleChange}
              placeholder="Years of Experience"
              disabled={loading}
            />
            
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              name="consultationFee"
              value={formData.consultationFee}
              onChange={handleChange}
              placeholder="Consultation Fee (optional)"
              disabled={loading}
            />
          </div>
        )}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}