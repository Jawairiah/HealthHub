// medicare-frontend/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, selectedRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      
      if (result?.ok) {
        const role = result.user?.role || selectedRole || 'patient';
        
        // Show success notification
        try {
          window.notify({
            title: 'Welcome Back',
            message: 'You have successfully logged in',
            type: 'success',
          });
        } catch {}
        
        // Navigate to appropriate dashboard
        navigate(role === 'doctor' ? '/doctor' : '/patient');
      } else {
        setError(result?.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card stack">
      <h2 className="title">Login</h2>
      <p className="subtitle">
        Access your {selectedRole || 'account'}
      </p>
      
      {error && (
        <div 
          className="notif unread" 
          style={{ borderColor: 'var(--danger)', marginBottom: '16px' }}
        >
          {error}
        </div>
      )}
      
      <form className="stack" onSubmit={onSubmit}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          disabled={loading}
        />
        
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          disabled={loading}
        />
        
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <p className="subtitle">
          Don't have an account?{' '}
          <a 
            href="/signup" 
            style={{ color: 'var(--teal)', fontWeight: 600 }}
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}