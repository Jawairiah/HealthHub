# users/views.py
from django.db import connection
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password, check_password
from users.serializers import RegisterSerializer, LoginSerializer


def dictfetchone(cursor):
    """Return one row from a cursor as a dict"""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        role = serializer.validated_data.get("role")
        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password")
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")
        clinic_id = serializer.validated_data.get("clinic_id")

        with connection.cursor() as cursor:
            # Check if email already exists
            cursor.execute("SELECT id FROM users_user WHERE email = %s", [email])
            if cursor.fetchone():
                return Response({"error": "Email already registered."}, status=400)

            # Hash password
            hashed_password = make_password(password)

            # Insert user
            cursor.execute("""
                INSERT INTO users_user 
                (email, password, first_name, last_name, role, 
                 is_active, is_staff, is_superuser, date_joined)
                VALUES (%s, %s, %s, %s, %s,
                    TRUE, FALSE, FALSE, NOW())
                    RETURNING id
                    """, [email, hashed_password, first_name, last_name, role])

            user_id = cursor.fetchone()[0]

            if role == "doctor":
                specialization = serializer.validated_data.get("specialization", "")
                qualification = serializer.validated_data.get("qualification", "")
                experience_years = serializer.validated_data.get("experience_years")

                # Create doctor profile WITHOUT clinic_name
                cursor.execute("""
                    INSERT INTO doctors_doctorprofile 
                    (user_id, specialization, qualification, experience_years, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    RETURNING id
                """, [user_id, specialization, qualification, experience_years])
                
                doctor_id = cursor.fetchone()[0]

                # Create DoctorClinic if clinic selected
                if clinic_id:
                    cursor.execute("""
                        SELECT id FROM clinic_clinic WHERE id = %s
                    """, [clinic_id])
                    
                    if cursor.fetchone():
                        cursor.execute("""
                            INSERT INTO doctors_doctorclinic (doctor_id, clinic_id, created_at)
                            VALUES (%s, %s, NOW())
                        """, [doctor_id, clinic_id])

            elif role == "patient":
                phone = serializer.validated_data.get("phone", "")
                date_of_birth = serializer.validated_data.get("date_of_birth")
                gender = serializer.validated_data.get("gender", "")
                address = serializer.validated_data.get("address", "")

                # Create patient profile
                cursor.execute("""
                    INSERT INTO patients_patientprofile 
                    (user_id, date_of_birth, gender, phone, address, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, [user_id, date_of_birth, gender, phone, address])

            # Get user data for response
            cursor.execute("""
                SELECT id, email, first_name, last_name, role 
                FROM users_user WHERE id = %s
            """, [user_id])
            
            user_data = dictfetchone(cursor)

        return Response({
            "user": user_data,
            "detail": "Account created successfully."
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        role = serializer.validated_data["role"]
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        with connection.cursor() as cursor:
            # Get user by email
            cursor.execute("""
                SELECT id, email, password, first_name, last_name, role, is_active
                FROM users_user 
                WHERE email = %s
            """, [email])
            
            user_data = dictfetchone(cursor)

            if not user_data:
                return Response({"detail": "Invalid credentials."}, status=401)

            # Check password
            if not check_password(password, user_data['password']):
                return Response({"detail": "Invalid credentials."}, status=401)

            # Check if user is active
            if not user_data['is_active']:
                return Response({"detail": "Account is inactive."}, status=403)

            # Check role match
            if user_data['role'] != role:
                return Response({
                    "detail": "Role mismatch. Please login using the correct role."
                }, status=403)

        # Create a minimal user object for JWT
        class MinimalUser:
            def __init__(self, user_id):
                self.id = user_id
                self.pk = user_id

        user_obj = MinimalUser(user_data['id'])
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user_obj)

        return Response({
            "user": {
                "id": user_data['id'],
                "email": user_data['email'],
                "first_name": user_data['first_name'],
                "last_name": user_data['last_name'],
                "role": user_data['role']
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        })