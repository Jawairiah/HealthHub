import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import * as api from "../../lib/api";
import { AuthContext } from "../../context/AuthContext";

/*
 Clinic details page:
 - shows appointments for this clinic (GET /api/doctors/appointments/?clinic_id=)
 - shows availability list (GET /api/doctors/available-slots/?clinic_id= maybe)
 - provides form to add availability (POST /api/doctors/add-availability/)
 - provides update fee action (PATCH /api/doctors/update-clinic/<pk>/)
*/

export default function ClinicDetails() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [availForm, setAvailForm] = useState({
    doctor_clinic: null,
    date: "",
    start_time: "",
    end_time: "",
    slot_duration: 30,
  });
  const [doctorClinicEntry, setDoctorClinicEntry] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // find the doctor_clinic id from my-clinics
        const r = await api.get("/api/doctors/my-clinics/");
        const found = r.data.find((dc) => dc.clinic.id === Number(id));
        setDoctorClinicEntry(found);
        if (found) {
          // fetch appointments for that clinic
          const ap = await api.get(`/api/doctors/appointments/?clinic_id=${id}`);
          setAppointments(ap.data);
          setAvailForm((s) => ({ ...s, doctor_clinic: found.id }));
        } else {
          setError("You are not associated with this clinic");
        }
      } catch (err) {
        setError(err.response?.data || "Failed to load clinic info");
      }
    }
    load();
  }, [id, user]);

  const createAvailability = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/doctors/add-availability/", availForm);
      alert("Availability created");
    } catch (err) {
      setError(err.response?.data || "Failed to create availability");
    }
  };

  return (
    <div className="container">
      <h2>Clinic {id} Management</h2>
      {error && <div className="error">{JSON.stringify(error)}</div>}

      <section>
        <h3>Appointments</h3>
        {appointments.length === 0 && <p>No appointments for this clinic.</p>}
        <ul>
          {appointments.map((a) => (
            <li key={a.id}>
              {new Date(a.scheduled_time).toLocaleString()} — Patient: {a.patient ? a.patient.user : "Unknown"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Add Availability</h3>
        <form onSubmit={createAvailability}>
          <input type="date" name="date" value={availForm.date} onChange={(e)=>setAvailForm({...availForm, date:e.target.value})} required />
          <input type="time" name="start_time" value={availForm.start_time} onChange={(e)=>setAvailForm({...availForm, start_time:e.target.value})} required />
          <input type="time" name="end_time" value={availForm.end_time} onChange={(e)=>setAvailForm({...availForm, end_time:e.target.value})} required />
          <input type="number" name="slot_duration" value={availForm.slot_duration} onChange={(e)=>setAvailForm({...availForm, slot_duration:Number(e.target.value)})} />
          <button type="submit">Save availability</button>
        </form>
      </section>
    </div>
  );
}
