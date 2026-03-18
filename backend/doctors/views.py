# doctors/views.py - POSTGRESQL COMPATIBLE VERSION
from django.db import connection
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.views import APIView
from datetime import datetime, date
from doctors.serializers import (
    DoctorClinicSerializer, 
    DoctorAvailabilitySerializer,
    DoctorAppointmentSerializer,
    DoctorPastAppointmentSerializer,
    DoctorProfileSerializer
)


def dictfetchall(cursor):
    """Return all rows from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def dictfetchone(cursor):
    """Return one row from a cursor as a dict"""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


class DoctorProfileView(APIView):
    """View and update doctor profile"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get doctor profile"""
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    dp.id,
                    dp.user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    dp.specialization,
                    dp.qualification,
                    dp.experience_years,
                    dp.consultation_fee,
                    dp.created_at
                FROM doctors_doctorprofile dp
                INNER JOIN users_user u ON dp.user_id = u.id
                WHERE dp.user_id = %s
            """, [user.id])
            
            profile = dictfetchone(cursor)
            
            if not profile:
                return Response({"detail": "Doctor profile not found."}, status=404)
        
        serializer = DoctorProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        """Update doctor profile"""
        user = request.user
        
        # Get updatable fields
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        specialization = request.data.get("specialization")
        qualification = request.data.get("qualification")
        experience_years = request.data.get("experience_years")
        consultation_fee = request.data.get("consultation_fee")
        
        with connection.cursor() as cursor:
            # Check if doctor profile exists
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            if not cursor.fetchone():
                return Response({"error": "Doctor profile not found."}, status=404)
            
            # Check email uniqueness if email is being changed
            if email and email != user.email:
                cursor.execute("""
                    SELECT id FROM users_user WHERE email = %s AND id != %s
                """, [email, user.id])
                
                if cursor.fetchone():
                    return Response({"error": "Email already in use."}, status=400)
            
            # Update user table fields
            user_updates = []
            user_params = []
            
            if first_name is not None:
                user_updates.append("first_name = %s")
                user_params.append(first_name)
            
            if last_name is not None:
                user_updates.append("last_name = %s")
                user_params.append(last_name)
            
            if email is not None:
                user_updates.append("email = %s")
                user_params.append(email)
            
            if user_updates:
                user_params.append(user.id)
                cursor.execute(f"""
                    UPDATE users_user 
                    SET {', '.join(user_updates)}
                    WHERE id = %s
                """, user_params)
            
            # Update doctor profile fields
            profile_updates = []
            profile_params = []
            
            if specialization is not None:
                profile_updates.append("specialization = %s")
                profile_params.append(specialization)
            
            if qualification is not None:
                profile_updates.append("qualification = %s")
                profile_params.append(qualification)
            
            if experience_years is not None:
                profile_updates.append("experience_years = %s")
                profile_params.append(experience_years)
            
            if consultation_fee is not None:
                profile_updates.append("consultation_fee = %s")
                profile_params.append(consultation_fee)
            
            if profile_updates:
                profile_params.append(user.id)
                cursor.execute(f"""
                    UPDATE doctors_doctorprofile 
                    SET {', '.join(profile_updates)}
                    WHERE user_id = %s
                """, profile_params)
        
        return Response({"message": "Profile updated successfully."})


class DoctorClinicListView(APIView):
    """Get list of clinics where the doctor is registered"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"detail": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            cursor.execute("""
                SELECT 
                    dc.id,
                    dc.clinic_id,
                    c.name as clinic_name,
                    c.address as clinic_address,
                    c.phone as clinic_phone,
                    c.email as clinic_email,
                    dc.consultation_fee,
                    dc.created_at
                FROM doctors_doctorclinic dc
                INNER JOIN clinic_clinic c ON dc.clinic_id = c.id
                WHERE dc.doctor_id = %s
                ORDER BY dc.created_at DESC
            """, [doctor_id])
            
            clinics = dictfetchall(cursor)
        
        serializer = DoctorClinicSerializer(clinics, many=True)
        return Response(serializer.data)


class DoctorClinicAddView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        clinic_id = request.data.get("clinic_id")
        fee = request.data.get("consultation_fee")

        if not clinic_id:
            return Response({"error": "clinic_id is required"}, status=400)

        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"error": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            cursor.execute("SELECT id FROM clinic_clinic WHERE id = %s", [clinic_id])
            if not cursor.fetchone():
                return Response({"error": "Invalid clinic ID"}, status=400)
            
            cursor.execute("""
                SELECT id FROM doctors_doctorclinic 
                WHERE doctor_id = %s AND clinic_id = %s
            """, [doctor_id, clinic_id])
            
            existing = cursor.fetchone()
            if existing:
                return Response({"message": "Doctor already associated with this clinic."}, status=200)
            
            cursor.execute("""
                INSERT INTO doctors_doctorclinic (doctor_id, clinic_id, consultation_fee, created_at)
                VALUES (%s, %s, %s, NOW())
                RETURNING id
            """, [doctor_id, clinic_id, fee])
            
            new_id = cursor.fetchone()[0]
        
        return Response({"message": "Clinic added successfully.", "id": new_id}, status=201)


class DoctorClinicRemoveView(APIView):
    """Remove/drop a clinic association if no appointments exist"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, clinic_id):
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"error": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            # Check if doctor-clinic relationship exists
            cursor.execute("""
                SELECT id FROM doctors_doctorclinic 
                WHERE doctor_id = %s AND clinic_id = %s
            """, [doctor_id, clinic_id])
            
            if not cursor.fetchone():
                return Response({"error": "Clinic association not found."}, status=404)
            
            # Check for existing appointments at this clinic
            cursor.execute("""
                SELECT COUNT(*) FROM appointments_appointment
                WHERE doctor_id = %s AND clinic_id = %s
                AND status IN ('booked', 'rescheduled')
            """, [doctor_id, clinic_id])
            
            appointment_count = cursor.fetchone()[0]
            
            if appointment_count > 0:
                return Response({
                    "error": f"Cannot remove clinic. {appointment_count} active appointment(s) exist."
                }, status=400)
            
            # Delete the relationship
            cursor.execute("""
                DELETE FROM doctors_doctorclinic 
                WHERE doctor_id = %s AND clinic_id = %s
            """, [doctor_id, clinic_id])
        
        return Response({"message": "Clinic association removed successfully."})


class DoctorAvailabilityCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        doctor_clinic_id = request.data.get("doctor_clinic_id")
        date_str = request.data.get("date")
        start_time_str = request.data.get("start_time")
        end_time_str = request.data.get("end_time")
        slot_duration = request.data.get("slot_duration", 30)

        if not all([doctor_clinic_id, date_str, start_time_str, end_time_str]):
            return Response({"error": "Missing required fields"}, status=400)

        try:
            availability_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
        except ValueError:
            return Response({"error": "Invalid date or time format"}, status=400)

        if availability_date < date.today():
            return Response({"error": "Cannot set availability for past dates"}, status=400)

        if availability_date == date.today():
            current_time = datetime.now().time()
            if start_time < current_time:
                return Response({"error": "Cannot set availability for past time slots"}, status=400)

        if start_time >= end_time:
            return Response({"error": "Start time must be before end time"}, status=400)

        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"error": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            cursor.execute("""
                SELECT id FROM doctors_doctorclinic 
                WHERE id = %s AND doctor_id = %s
            """, [doctor_clinic_id, doctor_id])
            
            if not cursor.fetchone():
                return Response({"error": "You can only set availability for your own clinics."}, status=403)
            
            # POSTGRESQL FIX: Use scheduled_time::date and scheduled_time::time
            cursor.execute("""
                SELECT COUNT(*) FROM appointments_appointment
                WHERE doctor_id = %s 
                  AND scheduled_time::date = %s
                  AND scheduled_time::time >= %s
                  AND scheduled_time::time < %s
                  AND status != 'cancelled'
            """, [doctor_id, availability_date, start_time, end_time])
            
            appt_count = cursor.fetchone()[0]
            if appt_count > 0:
                return Response({
                    "error": "Cannot update availability. Appointments exist in this time slot."
                }, status=400)
            
            cursor.execute("""
                SELECT id FROM doctors_doctoravailability
                WHERE doctor_clinic_id = %s 
                  AND date = %s 
                  AND start_time = %s
            """, [doctor_clinic_id, availability_date, start_time])
            
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                    UPDATE doctors_doctoravailability
                    SET end_time = %s, slot_duration = %s, is_available = TRUE
                    WHERE id = %s
                    RETURNING id
                """, [end_time, slot_duration, existing[0]])
                
                availability_id = cursor.fetchone()[0]
                message = "Availability updated successfully."
            else:
                cursor.execute("""
                    INSERT INTO doctors_doctoravailability 
                    (doctor_clinic_id, date, start_time, end_time, slot_duration, is_available, created_at)
                    VALUES (%s, %s, %s, %s, %s, TRUE, NOW())
                    RETURNING id
                """, [doctor_clinic_id, availability_date, start_time, end_time, slot_duration])
                
                availability_id = cursor.fetchone()[0]
                message = "Availability created successfully."
        
        return Response({"message": message, "id": availability_id}, status=201)


class DoctorMyAppointmentsView(APIView):
    """View all upcoming appointments for the doctor"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"detail": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            cursor.execute("""
                SELECT 
                    a.id,
                    a.patient_id,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    a.clinic_id,
                    c.name as clinic_name,
                    a.scheduled_time,
                    a.status,
                    a.notes,
                    a.created_at
                FROM appointments_appointment a
                INNER JOIN patients_patientprofile p ON a.patient_id = p.id
                INNER JOIN users_user u ON p.user_id = u.id
                INNER JOIN clinic_clinic c ON a.clinic_id = c.id
                WHERE a.doctor_id = %s
                  AND a.scheduled_time >= NOW()
                  AND a.status != 'cancelled'
                ORDER BY a.scheduled_time ASC
            """, [doctor_id])
            
            appointments = dictfetchall(cursor)
        
        serializer = DoctorAppointmentSerializer(appointments, many=True)
        return Response(serializer.data)


class DoctorPastAppointmentsView(APIView):
    """View all past/completed appointments for the doctor"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorprofile WHERE user_id = %s
            """, [user.id])
            
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return Response({"detail": "User is not a doctor."}, status=400)
            
            doctor_id = doctor_row[0]
            
            cursor.execute("""
                SELECT 
                    pa.id,
                    pa.patient_id,
                    CONCAT(u.first_name, ' ', u.last_name) as patient_name,
                    pa.clinic_id,
                    c.name as clinic_name,
                    pa.scheduled_time,
                    pa.status,
                    pa.notes,
                    pa.created_at,
                    pa.completed_at
                FROM appointments_pastappointment pa
                INNER JOIN patients_patientprofile p ON pa.patient_id = p.id
                INNER JOIN users_user u ON p.user_id = u.id
                INNER JOIN clinic_clinic c ON pa.clinic_id = c.id
                WHERE pa.doctor_id = %s
                ORDER BY pa.scheduled_time DESC
            """, [doctor_id])
            
            past_appointments = dictfetchall(cursor)
        
        serializer = DoctorPastAppointmentSerializer(past_appointments, many=True)
        return Response(serializer.data)