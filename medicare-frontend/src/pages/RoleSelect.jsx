import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleSelect() {
  const { selectedRole, selectRole } = useAuth();
  const navigate = useNavigate();

  const choose = (role) => {
    selectRole(role);
    navigate('/signup');
  };

  return (
    <div className="card">
      <h1 className="title">Welcome to Medicare</h1>
      <p className="subtitle">Select your role to continue</p>
      <div className="grid">
        <button className="btn" onClick={() => choose('patient')}>I am a Patient</button>
        <button className="btn secondary" onClick={() => choose('doctor')}>I am a Doctor</button>
      </div>
      {selectedRole && <div className="section"><span className="badge">Selected: {selectedRole}</span></div>}
    </div>
  );
}