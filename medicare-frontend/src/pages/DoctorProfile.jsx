import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedRole, isAuthenticated } = useAuth();
  const { doctors, getSlotsForDate, bookAppointment } = useAppointments();
  const doctor = useMemo(() => doctors.find(d => d.id === Number(id)), [doctors, id]);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState([]);

  // load slots from backend or fallback
  useEffect(() => {
    (async () => {
      const s = await getSlotsForDate(id, date);
      setSlots(s);
    })();
  }, [id, date, getSlotsForDate]);

  const onBook = async (start) => {
    if (!isAuthenticated || selectedRole !== 'patient') {
      navigate('/login');
      return;
    }
    const res = await bookAppointment(id, date, start);
    if (res.ok) navigate('/patient');
  };

  if (!doctor) return <div className="card">Doctor not found.</div>;

  return (
    <div className="card stack">
      <h2 className="title">{doctor.name}</h2>
      <p className="subtitle">{doctor.specialty} • {doctor.location}</p>
      <div className="row">
        <div className="stack" style={{ flex: 1 }}>
          <label className="subtitle">Select Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="stack" style={{ flex: 1 }}>
          <label className="subtitle">Slot Rules</label>
          <div className="notif">Duration: {doctor.rules.slotDuration}m • Buffer: {doctor.rules.buffer}m</div>
        </div>
      </div>
      <div className="section">
        <h3 className="subtitle">Available Slots</h3>
        <div className="grid">
          {slots.map(s => (
            <button key={s.start} className="btn" onClick={() => onBook(s.start)}>{s.start} - {s.end}</button>
          ))}
          {slots.length === 0 && <div className="notif">No slots available on the selected date.</div>}
        </div>
      </div>
    </div>
  );
}
