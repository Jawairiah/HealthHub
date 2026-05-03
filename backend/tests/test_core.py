# backend/tests/test_core.py
"""
Unit tests for the Medicare backend.
Run with: python manage.py test tests.test_core
"""

from django.test import TestCase
from django.contrib.auth.hashers import make_password
from django.db import connection
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json


# Helpers

def dictfetchone(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


def create_user_and_profile(role="patient", email="test@example.com", password="pass1234"):
    """
    Directly inserts a user + matching profile into the DB and returns (user_id, profile_id).
    Avoids going through the registration view so each test is self-contained.
    """
    hashed = make_password(password)
    with connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users_user
                (email, password, first_name, last_name, role,
                 is_active, is_staff, is_superuser, date_joined)
            VALUES (%s, %s, %s, %s, %s, TRUE, FALSE, FALSE, NOW())
            RETURNING id
            """,
            [email, hashed, "Test", "User", role],
        )
        user_id = cur.fetchone()[0]

        if role == "patient":
            cur.execute(
                """
                INSERT INTO patients_patientprofile
                    (user_id, date_of_birth, gender, phone, address, created_at)
                VALUES (%s, NULL, 'Male', '03001234567', 'Karachi', NOW())
                RETURNING id
                """,
                [user_id],
            )
            profile_id = cur.fetchone()[0]

        elif role == "doctor":
            cur.execute(
                """
                INSERT INTO doctors_doctorprofile
                    (user_id, specialization, qualification, experience_years, created_at)
                VALUES (%s, 'Cardiology', 'MBBS', 10, NOW())
                RETURNING id
                """,
                [user_id],
            )
            profile_id = cur.fetchone()[0]

        else:
            profile_id = None

    return user_id, profile_id


def get_auth_client(user_id):
    """Return an APIClient pre-loaded with a valid JWT for user_id."""

    class _FakeUser:
        def __init__(self, uid):
            self.id = uid
            self.pk = uid

    token = RefreshToken.for_user(_FakeUser(user_id))
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return client


# TEST 1 – User Registration

class UserRegistrationTest(TestCase):
    """
    POST /api/auth/register/  →  201 with user data.

    Covers:
    • Happy-path patient registration.
    • Duplicate-email rejection (400).
    """

    URL = "/api/auth/register/"

    def test_patient_registration_succeeds(self):
        """Valid payload creates a patient account and returns 201."""
        client = APIClient()
        payload = {
            "role": "patient",
            "email": "newpatient@test.com",
            "password": "secure123",
            "first_name": "Alice",
            "last_name": "Smith",
            "phone": "03001234567",
            "gender": "Female",
        }
        response = client.post(self.URL, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "newpatient@test.com")
        self.assertEqual(response.data["user"]["role"], "patient")

        # Confirm the row is actually in the DB
        with connection.cursor() as cur:
            cur.execute("SELECT id FROM users_user WHERE email = %s", ["newpatient@test.com"])
            self.assertIsNotNone(cur.fetchone(), "User row not found in DB after registration")

    def test_duplicate_email_returns_400(self):
        """Registering with an already-used e-mail must return 400."""
        # Pre-seed the email
        create_user_and_profile(role="patient", email="taken@test.com")

        client = APIClient()
        payload = {
            "role": "patient",
            "email": "taken@test.com",
            "password": "secure123",
            "first_name": "Bob",
            "last_name": "Jones",
        }
        response = client.post(self.URL, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)


# TEST 2 – User Login

class UserLoginTest(TestCase):
    """
    POST /api/auth/login/  →  200 with JWT tokens.

    Covers:
    • Successful login returns access + refresh tokens.
    • Wrong password returns 401.
    • Role mismatch (logging in as doctor when registered as patient) returns 403.
    """

    URL = "/api/auth/login/"

    def setUp(self):
        create_user_and_profile(role="patient", email="patient@test.com", password="mypassword")

    def test_correct_credentials_return_tokens(self):
        client = APIClient()
        response = client.post(
            self.URL,
            {"role": "patient", "email": "patient@test.com", "password": "mypassword"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "patient")

    def test_wrong_password_returns_401(self):
        client = APIClient()
        response = client.post(
            self.URL,
            {"role": "patient", "email": "patient@test.com", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_role_mismatch_returns_403(self):
        """Trying to log in as 'doctor' with a patient account must fail."""
        client = APIClient()
        response = client.post(
            self.URL,
            {"role": "doctor", "email": "patient@test.com", "password": "mypassword"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


# TEST 3 – Doctor Profile

class DoctorProfileTest(TestCase):
    """
    GET  /api/doctors/profile/  →  200 with profile data.
    PUT  /api/doctors/profile/  →  200 after update; changes are persisted.

    Covers:
    • Unauthenticated request returns 401.
    • Authenticated doctor can read their profile.
    • Profile fields update correctly.
    """

    GET_PUT_URL = "/api/doctors/profile/"

    def setUp(self):
        self.user_id, _ = create_user_and_profile(
            role="doctor", email="doc@test.com", password="docpass"
        )
        self.client = get_auth_client(self.user_id)

    def test_unauthenticated_returns_401(self):
        anon = APIClient()
        response = anon.get(self.GET_PUT_URL)
        self.assertEqual(response.status_code, 401)

    def test_get_profile_returns_correct_data(self):
        response = self.client.get(self.GET_PUT_URL)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["email"], "doc@test.com")
        self.assertEqual(response.data["specialization"], "Cardiology")

    def test_update_profile_persists_changes(self):
        update_payload = {
            "first_name": "House",
            "last_name": "MD",
            "email": "doc@test.com",
            "specialization": "Neurology",
            "qualification": "MD, FRCP",
            "experience_years": 15,
        }
        response = self.client.put(self.GET_PUT_URL, update_payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)

        # Confirm changes persisted in DB
        with connection.cursor() as cur:
            cur.execute(
                "SELECT specialization FROM doctors_doctorprofile WHERE user_id = %s",
                [self.user_id],
            )
            row = cur.fetchone()
        self.assertEqual(row[0], "Neurology")


# TEST 4 – Patient Appointment Booking

class AppointmentBookingTest(TestCase):
    """
    POST /api/patient/book-appointment/

    Covers:
    • Booking on a valid slot returns 201.
    • Booking the same slot twice returns 409 (conflict).
    • Booking in the past returns 400.
    """

    BOOK_URL = "/api/patient/book-appointment/"

    def setUp(self):
        # Create clinic
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO clinic_clinic (name, address, phone, email, created_at)
                VALUES ('Test Clinic', '123 Main St', '0213001234', 'clinic@test.com', NOW())
                RETURNING id
                """,
            )
            self.clinic_id = cur.fetchone()[0]

        # Create doctor
        self.doc_user_id, self.doc_profile_id = create_user_and_profile(
            role="doctor", email="bookdoc@test.com"
        )

        # Link doctor → clinic
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO doctors_doctorclinic (doctor_id, clinic_id, consultation_fee, created_at)
                VALUES (%s, %s, 1500, NOW())
                RETURNING id
                """,
                [self.doc_profile_id, self.clinic_id],
            )
            self.dc_id = cur.fetchone()[0]

            # Set availability for tomorrow
            cur.execute(
                """
                INSERT INTO doctors_doctoravailability
                    (doctor_clinic_id, date, start_time, end_time, slot_duration, is_available, created_at)
                VALUES (%s, CURRENT_DATE + 1, '09:00', '17:00', 30, TRUE, NOW())
                """,
                [self.dc_id],
            )

        # Create patient
        self.pat_user_id, _ = create_user_and_profile(
            role="patient", email="bookpat@test.com"
        )
        self.client = get_auth_client(self.pat_user_id)

        # Slot: tomorrow at 09:00
        from datetime import date, timedelta
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        self.valid_time = f"{tomorrow}T09:00"

    def test_valid_booking_returns_201(self):
        response = self.client.post(
            self.BOOK_URL,
            {
                "doctor_id": self.doc_profile_id,
                "clinic_id": self.clinic_id,
                "scheduled_time": self.valid_time,
                "notes": "First visit",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("appointment", response.data)

    def test_double_booking_same_slot_returns_409(self):
        # Book once
        self.client.post(
            self.BOOK_URL,
            {"doctor_id": self.doc_profile_id, "clinic_id": self.clinic_id,
             "scheduled_time": self.valid_time, "notes": ""},
            format="json",
        )
        # Attempt to book the same slot again (different patient still triggers conflict)
        response = self.client.post(
            self.BOOK_URL,
            {"doctor_id": self.doc_profile_id, "clinic_id": self.clinic_id,
             "scheduled_time": self.valid_time, "notes": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 409)

    def test_past_slot_returns_400(self):
        response = self.client.post(
            self.BOOK_URL,
            {
                "doctor_id": self.doc_profile_id,
                "clinic_id": self.clinic_id,
                "scheduled_time": "2020-01-01T09:00",
                "notes": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)


# TEST 5 – Notifications

class NotificationTest(TestCase):
    """
    GET    /api/notifications/            →  list for current user.
    POST   /api/notifications/<id>/read/  →  marks one as read.
    POST   /api/notifications/mark-all-read/  →  marks all as read.

    Covers:
    • User only sees their own notifications (not another user's).
    • Marking a notification read sets is_read=True.
    • Unread count decreases after marking all read.
    """

    LIST_URL = "/api/notifications/"
    UNREAD_URL = "/api/notifications/unread-count/"
    MARK_ALL_URL = "/api/notifications/mark-all-read/"

    def setUp(self):
        from notifications.models import Notification

        self.user_id, _ = create_user_and_profile(
            role="patient", email="notif@test.com"
        )
        self.other_user_id, _ = create_user_and_profile(
            role="patient", email="other@test.com"
        )
        self.client = get_auth_client(self.user_id)

        # Import the actual User model via the ORM (needed by Notification FK)
        from users.models import User
        self.user_obj = User.objects.get(pk=self.user_id)
        self.other_obj = User.objects.get(pk=self.other_user_id)

        # Create 2 notifications for our user, 1 for the other
        Notification.objects.create(
            recipient=self.user_obj,
            notification_type="appointment_booked",
            title="Appt booked",
            message="Your appointment is confirmed.",
            is_read=False,
        )
        Notification.objects.create(
            recipient=self.user_obj,
            notification_type="system",
            title="System note",
            message="Welcome to Medicare.",
            is_read=False,
        )
        Notification.objects.create(
            recipient=self.other_obj,
            notification_type="system",
            title="Other user notif",
            message="Not yours.",
            is_read=False,
        )

    def test_list_returns_only_own_notifications(self):
        response = self.client.get(self.LIST_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2, "User should see exactly 2 notifications")
        titles = [n["title"] for n in response.data]
        self.assertNotIn("Other user notif", titles)

    def test_mark_single_notification_as_read(self):
        from notifications.models import Notification

        notif = Notification.objects.filter(recipient=self.user_obj, is_read=False).first()
        url = f"/api/notifications/{notif.pk}/read/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
        self.assertIsNotNone(notif.read_at)

    def test_mark_all_read_clears_unread_count(self):
        # Confirm unread count starts at 2
        r1 = self.client.get(self.UNREAD_URL)
        self.assertEqual(r1.data["count"], 2)

        # Mark all read
        r2 = self.client.post(self.MARK_ALL_URL)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["count"], 2)  # returns how many were marked

        # Unread count must now be 0
        r3 = self.client.get(self.UNREAD_URL)
        self.assertEqual(r3.data["count"], 0)