# users/serializers.py
from rest_framework import serializers

class RegisterSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[("doctor", "doctor"), ("patient", "patient")])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    # Doctor fields 
    specialization = serializers.CharField(required=False, allow_blank=True)
    qualification = serializers.CharField(required=False, allow_blank=True)
    experience_years = serializers.IntegerField(required=False, allow_null=True)
    clinic_id = serializers.IntegerField(required=False, allow_null=True)

    # Patient fields
    phone = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField()


class LoginSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[("doctor", "doctor"), ("patient", "patient")])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
