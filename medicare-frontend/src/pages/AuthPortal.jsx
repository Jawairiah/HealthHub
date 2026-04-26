import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import Signup from './Signup';

export default function AuthPortal(){
  const [params] = useSearchParams();
  const { selectRole, selectedRole } = useAuth();
  const initialTab = params.get('tab') === 'login' ? 'login' : 'signup';
  const [tab, setTab] = useState(initialTab);
  const roleParam = params.get('role');
  const showRoleSelector = !roleParam; // hide role selector when coming from homepage CTAs

  useEffect(() => {
    if (roleParam && roleParam !== selectedRole) {
      selectRole(roleParam);
    }
  }, [roleParam, selectedRole, selectRole]);

  return (
    <div className="card" style={{maxWidth: 860, margin:'0 auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 className="title" style={{margin:0}}>{tab === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <span className="badge">{(selectedRole || roleParam || 'patient').replace(/^(.)/, (m)=>m.toUpperCase())}</span>
      </div>
      {showRoleSelector && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16}}>
          <RoleCard
            title="Patient"
            description="Book and manage your appointments"
            img="/src/assets/patient.svg"
            selected={(selectedRole || 'patient') === 'patient'}
            onClick={() => selectRole('patient')}
          />
          <RoleCard
            title="Doctor"
            description="Manage your schedule and patients"
            img="/src/assets/doctor.svg"
            selected={(selectedRole) === 'doctor'}
            onClick={() => selectRole('doctor')}
          />
        </div>
      )}
      <div style={{display:'flex', gap:8, marginTop:16}}>
        <button className={"btn " + (tab === 'signup' ? '' : 'outline')} onClick={() => setTab('signup')}>Sign Up</button>
        <button className={"btn " + (tab === 'login' ? '' : 'outline')} onClick={() => setTab('login')}>Sign In</button>
      </div>
      <div className="section">
        {tab === 'login' ? <Login /> : <Signup />}
      </div>
    </div>
  );
}

function RoleCard({ title, description, img, selected, onClick }){
  return (
    <button onClick={onClick} className="card" style={{textAlign:'left', display:'flex', gap:16, alignItems:'center', borderColor: selected ? 'var(--teal)' : 'var(--border)'}}>
      <img src={img} alt={title} style={{width:80, height:80}} />
      <div>
        <div className="title" style={{fontSize:18, marginBottom:6}}>{title}</div>
        <div className="subtitle" style={{fontSize:13}}>{description}</div>
      </div>
    </button>
  );
}

