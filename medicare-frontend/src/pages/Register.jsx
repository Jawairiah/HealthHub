import React, { useState } from 'react';
import { UserCircle, Stethoscope, Mail, Lock, User, Phone, Calendar, MapPin } from 'lucide-react';

export default function EnhancedRegister() {
  // Get role from route state (passed from RoleSelect page)
  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedRole = urlParams.get('role') || 'patient';
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    // doctor fields
    specialization: '',
    qualification: '',
    experience_years: '',
    // patient fields
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const role = preSelectedRole; // Role is fixed from route

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Check password match
    if (name === 'confirmPassword' || name === 'password') {
      setPasswordMatch(
        name === 'confirmPassword' 
          ? value === form.password 
          : form.confirmPassword === value || form.confirmPassword === ''
      );
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      role,
      email: form.email,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name
    };

    if (role === 'doctor') {
      payload.specialization = form.specialization;
      payload.qualification = form.qualification;
      payload.experience_years = Number(form.experience_years) || 0;
    } else {
      payload.phone = form.phone;
      payload.date_of_birth = form.date_of_birth || null;
      payload.gender = form.gender;
      payload.address = form.address;
    }

    try {
      // API call would go here
      console.log('Registering:', payload);
      setTimeout(() => {
        alert('✅ Registration successful! Please login with your credentials.');
        window.location.href = '/login';
      }, 1000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />

      <div style={{
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '600px',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header with Role Badge */}
        <div style={{
          background: role === 'doctor' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '3rem 2rem 2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            marginBottom: '1rem',
            backdropFilter: 'blur(10px)'
          }}>
            {role === 'doctor' ? (
              <Stethoscope className="w-6 h-6" />
            ) : (
              <UserCircle className="w-6 h-6" />
            )}
            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
              {role === 'doctor' ? 'Doctor' : 'Patient'} Registration
            </span>
          </div>
          
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            marginBottom: '0.5rem'
          }}>
            Create Your Account
          </h2>
          <p style={{ opacity: 0.9, fontSize: '1rem' }}>
            Join Medicare and start your healthcare journey
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              border: '1px solid #fecaca',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Name Fields */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.9rem'
                }}>
                  <User className="w-4 h-4 inline mr-2" />
                  First Name *
                </label>
                <input
                  name="first_name"
                  placeholder="John"
                  value={form.first_name}
                  onChange={onChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.9rem'
                }}>
                  Last Name *
                </label>
                <input
                  name="last_name"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={onChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#374151',
                fontSize: '0.9rem'
              }}>
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                name="email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={onChange}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Password Fields */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.9rem'
                }}>
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChange}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.9rem'
                }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={onChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: `2px solid ${passwordMatch ? '#e5e7eb' : '#ef4444'}`,
                    borderRadius: '12px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            {!passwordMatch && (
              <p style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                marginTop: '-0.5rem',
                marginBottom: '1rem'
              }}>
                Passwords do not match
              </p>
            )}

            {/* Role-specific fields */}
            {role === 'doctor' ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.9rem'
                  }}>
                    <Stethoscope className="w-4 h-4 inline mr-2" />
                    Specialization
                  </label>
                  <input
                    name="specialization"
                    placeholder="e.g., Cardiologist, Pediatrician"
                    value={form.specialization}
                    onChange={onChange}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Qualification
                    </label>
                    <input
                      name="qualification"
                      placeholder="MBBS, MD"
                      value={form.qualification}
                      onChange={onChange}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Experience (years)
                    </label>
                    <input
                      name="experience_years"
                      type="number"
                      placeholder="5"
                      value={form.experience_years}
                      onChange={onChange}
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.9rem'
                  }}>
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={form.phone}
                    onChange={onChange}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date of Birth
                    </label>
                    <input
                      name="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={onChange}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={onChange}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: 'white'
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.9rem'
                  }}>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    placeholder="Your address"
                    value={form.address}
                    onChange={onChange}
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !passwordMatch}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading || !passwordMatch 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: loading || !passwordMatch ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading || !passwordMatch 
                  ? 'none' 
                  : '0 4px 15px rgba(102, 126, 234, 0.4)',
                marginTop: '1rem'
              }}
            >
              {loading ? '🔄 Creating Account...' : '✨ Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Already have an account?{' '}
              <a
                href="/login"
                style={{
                  color: '#667eea',
                  fontWeight: '600',
                  textDecoration: 'none',
                  borderBottom: '2px solid transparent',
                  transition: 'border-color 0.3s'
                }}
              >
                Sign In →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}