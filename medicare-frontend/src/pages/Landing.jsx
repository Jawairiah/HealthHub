import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing(){
  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="headline">
            Your Health, <span className="accent">Our</span>
            <br />
            <span className="priority">Priority</span>
          </h1>
          <p className="subtitle">Book, manage, and track your medical appointments with ease. Connect with top doctors and take control of your healthcare journey.</p>
          <div className="cta">
            <Link to="/auth?role=patient&tab=signup" className="btn">Book an Appointment</Link>
            <Link to="/auth?role=doctor&tab=signup" className="btn outline">Join as Doctor</Link>
          </div>
        </div>
        <div className="hero-visual">
          <img className="hero-image" src="/src/assets/hero-ecg.svg" alt="ECG" />
        </div>
      </section>

      <section className="centered">
        <h2 className="title" style={{textAlign:'center'}}>Why Choose Medicare?</h2>
        <p className="subtitle" style={{textAlign:'center'}}>Everything you need to manage your healthcare appointments in one place</p>
        <div className="feature-grid">
          {features.map((f)=> (
            <div key={f.title} className="feature">
              <div className="icon circ">{f.icon}</div>
              <div className="title" style={{fontSize:16}}>{f.title}</div>
              <div className="subtitle" style={{fontSize:13}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const features = [
  { title: 'Easy Booking', desc: 'Find doctors and reserve time slots in seconds.', icon: '📅' },
  { title: 'Flexible Scheduling', desc: 'Reschedule or cancel with simple controls.', icon: '🕒' },
  { title: 'Find Specialists', desc: 'Search by specialty and location to match your needs.', icon: '🩺' },
  { title: 'Doctor Dashboard', desc: 'Manage availability and view appointments easily.', icon: '📊' },
  { title: 'Real-time Updates', desc: 'Instant notifications for bookings and changes.', icon: '🔔' },
  { title: 'Secure & Private', desc: 'Your data is protected with modern best practices.', icon: '🔒' },
];
