# appointments/migrations/0002_past_appointments_and_triggers.py
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0001_initial'),
    ]

    operations = [
        # Create past_appointments table
        migrations.RunSQL(
            sql="""
            CREATE TABLE appointments_pastappointment (
                id BIGSERIAL PRIMARY KEY,
                doctor_id BIGINT NOT NULL REFERENCES doctors_doctorprofile(id) ON DELETE CASCADE,
                clinic_id BIGINT NOT NULL REFERENCES clinic_clinic(id) ON DELETE CASCADE,
                patient_id BIGINT NOT NULL REFERENCES patients_patientprofile(id) ON DELETE CASCADE,
                scheduled_time TIMESTAMP NOT NULL,
                status VARCHAR(20) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_past_appt_patient ON appointments_pastappointment(patient_id);
            CREATE INDEX idx_past_appt_doctor ON appointments_pastappointment(doctor_id);
            CREATE INDEX idx_past_appt_scheduled ON appointments_pastappointment(scheduled_time);
            """,
            reverse_sql="DROP TABLE IF EXISTS appointments_pastappointment CASCADE;"
        ),
        
        # Create trigger function to move completed appointments
        migrations.RunSQL(
            sql="""
            CREATE OR REPLACE FUNCTION move_to_past_appointments()
            RETURNS TRIGGER AS $$
            BEGIN
                -- If appointment is marked as completed or scheduled time has passed
                IF (NEW.status = 'completed' OR NEW.scheduled_time < NOW()) 
                   AND OLD.status != 'completed' THEN
                    
                    -- Insert into past appointments
                    INSERT INTO appointments_pastappointment (
                        id, doctor_id, clinic_id, patient_id, 
                        scheduled_time, status, notes, created_at, completed_at
                    )
                    VALUES (
                        NEW.id, NEW.doctor_id, NEW.clinic_id, NEW.patient_id,
                        NEW.scheduled_time, NEW.status, NEW.notes, NEW.created_at, NOW()
                    )
                    ON CONFLICT (id) DO NOTHING;
                    
                    -- Delete from current appointments
                    DELETE FROM appointments_appointment WHERE id = NEW.id;
                    
                    -- Return NULL to prevent the original update
                    RETURN NULL;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="DROP FUNCTION IF EXISTS move_to_past_appointments() CASCADE;"
        ),
        
        # Create trigger on appointments table
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trigger_move_to_past
            AFTER UPDATE ON appointments_appointment
            FOR EACH ROW
            EXECUTE FUNCTION move_to_past_appointments();
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trigger_move_to_past ON appointments_appointment;"
        ),
        
        # Create scheduled job trigger for auto-completion
        migrations.RunSQL(
            sql="""
            CREATE OR REPLACE FUNCTION auto_complete_past_appointments()
            RETURNS void AS $$
            BEGIN
                -- Move appointments where scheduled_time has passed
                INSERT INTO appointments_pastappointment (
                    id, doctor_id, clinic_id, patient_id,
                    scheduled_time, status, notes, created_at, completed_at
                )
                SELECT 
                    id, doctor_id, clinic_id, patient_id,
                    scheduled_time, 
                    CASE WHEN status = 'booked' THEN 'completed' ELSE status END,
                    notes, created_at, NOW()
                FROM appointments_appointment
                WHERE scheduled_time < NOW() 
                  AND status NOT IN ('cancelled')
                ON CONFLICT (id) DO NOTHING;
                
                -- Delete moved appointments
                DELETE FROM appointments_appointment 
                WHERE scheduled_time < NOW() 
                  AND status NOT IN ('cancelled');
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="DROP FUNCTION IF EXISTS auto_complete_past_appointments();"
        ),
    ]