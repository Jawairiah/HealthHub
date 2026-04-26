import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';

export default function Search() {
  const { searchDoctors } = useAppointments();
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    (async () => {
      const r = await searchDoctors({ specialty, location });
      setResults(r || []);
    })();
  }, [specialty, location, searchDoctors]);

  return (
    <div className="card stack">
      <h2 className="title">Find a Doctor</h2>
      <div className="row">
        <input className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty (e.g., Cardiology)" />
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g., Downtown)" />
      </div>
      <div className="section">
        <div className="stack">
          {results.map(d => (
            <div key={d.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <strong>{d.name}</strong>
                  <div className="subtitle">{d.specialty} • {d.location}</div>
                </div>
                <Link className="btn" to={`/doctor/${d.id}`}>View Profile</Link>
              </div>
            </div>
          ))}
          {results.length === 0 && <div className="notif">No doctors match your filters.</div>}
        </div>
      </div>
    </div>
  );
}
