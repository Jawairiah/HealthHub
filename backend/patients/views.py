# patients/views.py - POSTGRESQL COMPATIBLE VERSION
from django.db import connection
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.views import APIView
from datetime import datetime, timedelta, date
from django.utils import timezone
from patients.serializers import (
    DoctorListSerializer,
    DoctorDetailSerializer,
    AppointmentSerializer,
    PastAppointmentSerializer,
    PatientProfileSerializer
)
import re


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


def validate_phone(phone):
    """Validate phone number format"""
    if not phone:
        return True
    # Basic phone validation: 10-15 digits with optional + and spaces/dashes
    pattern = r'^\+?[\d\s\-]{10,15}$'
    return bool(re.match(pattern, phone.replace(' ', '').replace('-', '')))


class PatientProfileView(APIView):
    """View and update patient profile"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get patient profile"""
        user = request.user
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    pp.id,
                    pp.user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    pp.date_of_birth,
                    pp.gender,
                    pp.phone,
                    pp.address,
                    pp.created_at
                FROM patients_patientprofile pp
                INNER JOIN users_user u ON pp.user_id = u.id
                WHERE pp.user_id = %s
            """, [user.id])
            
            profile = dictfetchone(cursor)
            
            if not profile:
                return Response({"detail": "Patient profile not found."}, status=404)
            
            # Calculate age if date_of_birth exists
            if profile.get('date_of_birth'):
                today = date.today()
                dob = profile['date_of_birth']
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                profile['age'] = age
            else:
                profile['age'] = None
        
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        """Update patient profile"""
        user = request.user
        
        # Get updatable fields
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        date_of_birth = request.data.get("date_of_birth")
        gender = request.data.get("gender")
        phone = request.data.get("phone")
        address = request.data.get("address")
        
        # Validate phone if provided
        if phone and not validate_phone(phone):
            return Response({"error": "Invalid phone number format."}, status=400)
        
        # Validate gender if provided
        if gender and gender not in ['Male', 'Female', 'Other', 'male', 'female', 'other', '']:
            return Response({"error": "Invalid gender value."}, status=400)
        
        with connection.cursor() as cursor:
            # Check if patient profile exists
            cursor.execute("""
                SELECT id FROM patients_patientprofile WHERE user_id = %s
            """, [user.id])
            
            if not cursor.fetchone():
                return Response({"error": "Patient profile not found."}, status=404)
            
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
            
            # Update patient profile fields
            profile_updates = []
            profile_params = []
            
            if date_of_birth is not None:
                profile_updates.append("date_of_birth = %s")
                profile_params.append(date_of_birth if date_of_birth else None)
            
            if gender is not None:
                profile_updates.append("gender = %s")
                profile_params.append(gender)
            
            if phone is not None:
                profile_updates.append("phone = %s")
                profile_params.append(phone)
            
            if address is not None:
                profile_updates.append("address = %s")
                profile_params.append(address)
            
            if profile_updates:
                profile_params.append(user.id)
                cursor.execute(f"""
                    UPDATE patients_patientprofile 
                    SET {', '.join(profile_updates)}
                    WHERE user_id = %s
                """, profile_params)
        
        return Response({"message": "Profile updated successfully."})


class PatientDoctorListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        clinic_id = request.query_params.get("clinic_id")
        specialization = request.query_params.get("specialization")
        name = request.query_params.get("name")

        with connection.cursor() as cursor:
            sql = """
                SELECT DISTINCT
                    dp.id,
                    dp.user_id,
                    u.first_name,
                    u.last_name,
                    dp.specialization,
                    dp.qualification,
                    dp.experience_years
                FROM doctors_doctorprofile dp
                INNER JOIN users_user u ON dp.user_id = u.id
                WHERE 1=1
            """
            params = []

            if clinic_id:
                sql += " AND EXISTS (SELECT 1 FROM doctors_doctorclinic dc WHERE dc.doctor_id = dp.id AND dc.clinic_id = %s)"
                params.append(clinic_id)

            if specialization:
                sql += " AND dp.specialization ILIKE %s"
                params.append(f"%{specialization}%")

            if name:
                sql += " AND (u.first_name ILIKE %s OR u.last_name ILIKE %s)"
                params.extend([f"%{name}%", f"%{name}%"])

            sql += " ORDER BY u.first_name, u.last_name"

            cursor.execute(sql, params)
            doctors = dictfetchall(cursor)

            for doctor in doctors:
                cursor.execute("""
                    SELECT 
                        dc.clinic_id,
                        c.name as clinic_name,
                        dc.consultation_fee
                    FROM doctors_doctorclinic dc
                    INNER JOIN clinic_clinic c ON dc.clinic_id = c.id
                    WHERE dc.doctor_id = %s
                """, [doctor['id']])
                
                doctor['clinics'] = dictfetchall(cursor)

        serializer = DoctorListSerializer(doctors, many=True)
        return Response(serializer.data)


class PatientDoctorDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    dp.id,
                    dp.user_id,
                    u.first_name,
                    u.last_name,
                    dp.specialization,
                    dp.qualification,
                    dp.experience_years
                FROM doctors_doctorprofile dp
                INNER JOIN users_user u ON dp.user_id = u.id
                WHERE dp.id = %s
            """, [pk])

            doctor = dictfetchone(cursor)
            if not doctor:
                return Response({"detail": "Doctor not found."}, status=404)

            cursor.execute("""
                SELECT 
                    dc.clinic_id,
                    c.name as clinic_name,
                    dc.consultation_fee
                FROM doctors_doctorclinic dc
                INNER JOIN clinic_clinic c ON dc.clinic_id = c.id
                WHERE dc.doctor_id = %s
            """, [doctor['id']])
            
            doctor['clinics'] = dictfetchall(cursor)

        serializer = DoctorDetailSerializer(doctor)
        return Response(serializer.data)


class PatientDoctorAvailabilityView(APIView):
    """Get available time slots for a doctor at a clinic on a specific date"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")
        date_str = request.query_params.get("date")

        if not doctor_id or not clinic_id or not date_str:
            return Response({"error": "doctor_id, clinic_id, and date are required."}, status=400)

        try:
            availability_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        if availability_date < date.today():
            return Response({"date": date_str, "slots": [], "message": "Cannot book appointments in the past"})

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM doctors_doctorclinic
                WHERE doctor_id = %s AND clinic_id = %s
            """, [doctor_id, clinic_id])

            dc_row = cursor.fetchone()
            if not dc_row:
                return Response({"error": "Invalid doctor-clinic relationship."}, status=404)

            doctor_clinic_id = dc_row[0]

            cursor.execute("""
                SELECT 
                    date, start_time, end_time, slot_duration
                FROM doctors_doctoravailability
                WHERE doctor_clinic_id = %s 
                  AND date = %s 
                  AND is_available = TRUE
            """, [doctor_clinic_id, availability_date])

            availability = dictfetchone(cursor)
            if not availability:
                return Response({"date": date_str, "slots": [], "message": "No availability set for this date"})

            start_dt = datetime.combine(availability['date'], availability['start_time'])
            end_dt = datetime.combine(availability['date'], availability['end_time'])
            delta = timedelta(minutes=availability['slot_duration'])

            all_slots = []
            current = start_dt
            
            now = datetime.now()
            while current < end_dt:
                if availability_date == date.today():
                    if current > now:
                        all_slots.append(current.strftime("%H:%M"))
                else:
                    all_slots.append(current.strftime("%H:%M"))
                current += delta

            # POSTGRESQL FIX: Use scheduled_time::time instead of TIME(scheduled_time)
            cursor.execute("""
                SELECT scheduled_time::time as start_time
                FROM appointments_appointment
                WHERE doctor_id = %s 
                  AND clinic_id = %s 
                  AND scheduled_time::date = %s
                  AND status IN ('booked', 'rescheduled')
            """, [doctor_id, clinic_id, availability_date])

            booked_rows = cursor.fetchall()
            booked_set = {row[0].strftime("%H:%M") for row in booked_rows}

            free_slots = [slot for slot in all_slots if slot not in booked_set]

        return Response({
            "date": date_str, 
            "slots": free_slots,
            "total_slots": len(all_slots),
            "available_slots": len(free_slots),
            "booked_slots": len(booked_set)
        })


class PatientBookAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        doctor_id = request.data.get("doctor_id")
        clinic_id = request.data.get("clinic_id")
        scheduled_time_str = request.data.get("scheduled_time")
        notes = request.data.get("notes", "")

        if not (doctor_id and clinic_id and scheduled_time_str):
            return Response({"error": "Missing parameters."}, status=400)

        try:
            scheduled_time = datetime.strptime(scheduled_time_str, "%Y-%m-%dT%H:%M")
        except ValueError:
            return Response({"error": "scheduled_time must be in YYYY-MM-DDTHH:MM format."}, status=400)

        if scheduled_time < datetime.now():
            return Response({"error": "Cannot book appointments in the past"}, status=400)

        user = request.user

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM patients_patientprofile WHERE user_id = %s
            """, [user.id])

            patient_row = cursor.fetchone()
            if not patient_row:
                return Response({"error": "User is not a patient."}, status=400)

            patient_id = patient_row[0]

            cursor.execute("""
                SELECT id FROM doctors_doctorclinic
                WHERE doctor_id = %s AND clinic_id = %s
            """, [doctor_id, clinic_id])

            dc_row = cursor.fetchone()
            if not dc_row:
                return Response({"error": "Doctor is not registered at this clinic."}, status=404)

            doctor_clinic_id = dc_row[0]

            cursor.execute("""
                SELECT start_time, end_time, slot_duration
                FROM doctors_doctoravailability
                WHERE doctor_clinic_id = %s 
                  AND date = %s 
                  AND is_available = TRUE
            """, [doctor_clinic_id, scheduled_time.date()])

            availability = dictfetchone(cursor)
            if not availability:
                return Response({"error": "Doctor is not available on this date."}, status=400)

            start_dt = datetime.combine(scheduled_time.date(), availability['start_time'])
            end_dt = datetime.combine(scheduled_time.date(), availability['end_time'])

            if not (start_dt <= scheduled_time < end_dt):
                return Response({"error": "Scheduled time is outside doctor's availability window."}, status=400)

            diff_minutes = int((scheduled_time - start_dt).total_seconds() / 60)
            if diff_minutes % availability['slot_duration'] != 0:
                return Response({"error": "Scheduled time does not align with slot duration."}, status=400)

            cursor.execute("""
                SELECT id FROM appointments_appointment
                WHERE doctor_id = %s 
                  AND clinic_id = %s 
                  AND scheduled_time = %s
                  AND status IN ('booked', 'rescheduled')
            """, [doctor_id, clinic_id, scheduled_time])

            if cursor.fetchone():
                return Response({"error": "This slot is already booked."}, status=409)

            cursor.execute("""
                INSERT INTO appointments_appointment 
                (doctor_id, clinic_id, patient_id, scheduled_time, status, notes, created_at)
                VALUES (%s, %s, %s, %s, 'booked', %s, NOW())
                RETURNING id
            """, [doctor_id, clinic_id, patient_id, scheduled_time, notes])

            appointment_id = cursor.fetchone()[0]

        return Response({
            "message": "Appointment booked successfully.",
            "appointment": {
                "id": appointment_id,
                "doctor": doctor_id,
                "clinic": clinic_id,
                "patient": patient_id,
                "scheduled_time": scheduled_time.strftime("%Y-%m-%dT%H:%M"),
                "status": "booked",
                "notes": notes
            }
        }, status=201)


class PatientMyAppointmentsView(APIView):
    """View all upcoming appointments for the patient"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM patients_patientprofile WHERE user_id = %s
            """, [user.id])

            patient_row = cursor.fetchone()
            if not patient_row:
                return Response({"detail": "User is not a patient."}, status=400)

            patient_id = patient_row[0]

            cursor.execute("""
                SELECT 
                    a.id,
                    a.doctor_id,
                    CONCAT(u.first_name, ' ', u.last_name) as doctor_name,
                    a.clinic_id,
                    c.name as clinic_name,
                    a.scheduled_time,
                    a.status,
                    a.notes,
                    a.created_at
                FROM appointments_appointment a
                INNER JOIN doctors_doctorprofile dp ON a.doctor_id = dp.id
                INNER JOIN users_user u ON dp.user_id = u.id
                INNER JOIN clinic_clinic c ON a.clinic_id = c.id
                WHERE a.patient_id = %s
                  AND a.scheduled_time >= NOW()
                  AND a.status != 'cancelled'
                ORDER BY a.scheduled_time ASC
            """, [patient_id])

            appointments = dictfetchall(cursor)

        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)


class PatientPastAppointmentsView(APIView):
    """View all past appointments for the patient"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM patients_patientprofile WHERE user_id = %s
            """, [user.id])

            patient_row = cursor.fetchone()
            if not patient_row:
                return Response({"detail": "User is not a patient."}, status=400)

            patient_id = patient_row[0]

            cursor.execute("""
                SELECT 
                    pa.id,
                    pa.doctor_id,
                    CONCAT(u.first_name, ' ', u.last_name) as doctor_name,
                    pa.clinic_id,
                    c.name as clinic_name,
                    pa.scheduled_time,
                    pa.status,
                    pa.notes,
                    pa.created_at,
                    pa.completed_at
                FROM appointments_pastappointment pa
                INNER JOIN doctors_doctorprofile dp ON pa.doctor_id = dp.id
                INNER JOIN users_user u ON dp.user_id = u.id
                INNER JOIN clinic_clinic c ON pa.clinic_id = c.id
                WHERE pa.patient_id = %s
                ORDER BY pa.scheduled_time DESC
            """, [patient_id])

            past_appointments = dictfetchall(cursor)

        serializer = PastAppointmentSerializer(past_appointments, many=True)
        return Response(serializer.data)


class PatientCancelAppointmentView(APIView):
    """Cancel an upcoming appointment"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, appointment_id):
        user = request.user

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM patients_patientprofile WHERE user_id = %s
            """, [user.id])

            patient_row = cursor.fetchone()
            if not patient_row:
                return Response({"error": "User is not a patient."}, status=400)

            patient_id = patient_row[0]

            cursor.execute("""
                SELECT id, status, scheduled_time 
                FROM appointments_appointment
                WHERE id = %s AND patient_id = %s
            """, [appointment_id, patient_id])

            appointment = dictfetchone(cursor)
            if not appointment:
                return Response({"error": "Appointment not found or does not belong to you."}, status=404)

            if appointment['status'] == 'cancelled':
                return Response({"error": "Appointment is already cancelled."}, status=400)

            if appointment['scheduled_time'] < timezone.now():
                return Response({"error": "Cannot cancel past appointments."}, status=400)

            cursor.execute("""
                UPDATE appointments_appointment
                SET status = 'cancelled'
                WHERE id = %s
            """, [appointment_id])

        return Response({
            "message": "Appointment cancelled successfully.",
            "appointment_id": appointment_id
        })
        

class PatientDoctorListView(APIView):
    """
    Enhanced doctor search with multiple filters
    
    Query Parameters:
    - name: Search by doctor's first or last name (partial match, case-insensitive)
    - specialization: Filter by specialization (partial match, case-insensitive)
    - clinic_name: Filter by clinic name (partial match, case-insensitive)
    
    Examples:
    GET /api/patient/doctors/?name=smith
    GET /api/patient/doctors/?specialization=cardio
    GET /api/patient/doctors/?clinic_name=City Hospital
    GET /api/patient/doctors/?name=john&specialization=cardiology&clinic_name=city
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get search parameters
        name = request.query_params.get("name")
        specialization = request.query_params.get("specialization")
        clinic_name = request.query_params.get("clinic_name")

        with connection.cursor() as cursor:
            # Build dynamic SQL query
            sql = """
                SELECT DISTINCT
                    dp.id,
                    dp.user_id,
                    u.first_name,
                    u.last_name,
                    dp.specialization,
                    dp.qualification,
                    dp.experience_years
                FROM doctors_doctorprofile dp
                INNER JOIN users_user u ON dp.user_id = u.id
                WHERE 1=1
            """
            params = []

            # Filter by doctor name (first OR last name)
            if name:
                sql += " AND (u.first_name ILIKE %s OR u.last_name ILIKE %s)"
                params.extend([f"%{name}%", f"%{name}%"])

            # Filter by specialization
            if specialization:
                sql += " AND dp.specialization ILIKE %s"
                params.append(f"%{specialization}%")

            # Filter by clinic name
            # This searches for doctors who are registered at clinics matching the clinic_name
            if clinic_name:
                sql += """
                    AND EXISTS (
                        SELECT 1 
                        FROM doctors_doctorclinic dc
                        INNER JOIN clinic_clinic c ON dc.clinic_id = c.id
                        WHERE dc.doctor_id = dp.id 
                        AND c.name ILIKE %s
                    )
                """
                params.append(f"%{clinic_name}%")

            # Order results by name
            sql += " ORDER BY u.first_name, u.last_name"

            cursor.execute(sql, params)
            doctors = dictfetchall(cursor)

            # For each doctor, get their associated clinics
            for doctor in doctors:
                cursor.execute("""
                    SELECT 
                        dc.clinic_id,
                        c.name as clinic_name,
                        dc.consultation_fee
                    FROM doctors_doctorclinic dc
                    INNER JOIN clinic_clinic c ON dc.clinic_id = c.id
                    WHERE dc.doctor_id = %s
                    ORDER BY c.name
                """, [doctor['id']])
                
                doctor['clinics'] = dictfetchall(cursor)

        serializer = DoctorListSerializer(doctors, many=True)
        return Response({
            "count": len(doctors),
            "filters_applied": {
                "name": name,
                "specialization": specialization,
                "clinic_name": clinic_name
            },
            "results": serializer.data
        })