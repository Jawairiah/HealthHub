# doctors/models.py
from django.db import models
from users.models import User
from clinic.models import Clinic

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    specialization = models.CharField(max_length=255, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dr. {self.user.first_name} {self.user.last_name}"




class DoctorClinic(models.Model):
    doctor = models.ForeignKey("DoctorProfile", on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("doctor", "clinic")

    def __str__(self):
        return f"{self.doctor} at {self.clinic}"



class DoctorAvailability(models.Model):
    doctor_clinic = models.ForeignKey(DoctorClinic, on_delete=models.CASCADE)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=30)  
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("doctor_clinic", "date", "start_time")

    def __str__(self):
        return f"{self.doctor_clinic.doctor} - {self.date} ({self.start_time}-{self.end_time})"
