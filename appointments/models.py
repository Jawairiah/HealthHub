# appointments/models.py
from django.db import models
from doctors.models import DoctorProfile
from patients.models import PatientProfile
from clinic.models import Clinic

class Appointment(models.Model):
    STATUS_CHOICES = [
        ("booked", "Booked"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
        ("rescheduled", "Rescheduled"),
    ]

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="booked")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient} with {self.doctor} at {self.clinic} on {self.scheduled_time}"


class PastAppointment(models.Model):
    STATUS_CHOICES = [
        ("booked", "Booked"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
        ("rescheduled", "Rescheduled"),
    ]

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField()
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointments_pastappointment'

    def __str__(self):
        return f"Past: {self.patient} with {self.doctor} on {self.scheduled_time}"