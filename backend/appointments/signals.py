# backend/appointments/signals.py
"""
Signal handlers for appointment notifications
Triggers both in-app and email notifications
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import Appointment
import logging

logger = logging.getLogger('appointments.signals')


def create_notification(user, title, message, notification_type, meta=None):
    """Create in-app notification"""
    from notifications.models import Notification
    
    Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        notification_type=notification_type,
        meta=meta or {},
        is_read=False
    )


def send_notification_email(recipient_email, subject, message):
    """Send email notification"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Email sent to {recipient_email}")
        
        # Log to EmailLog
        from notifications.models import EmailLog
        EmailLog.objects.create(
            recipient_email=recipient_email,
            subject=subject,
            body=message,
            status='sent',
            sent_at=timezone.now()
        )
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        from notifications.models import EmailLog
        EmailLog.objects.create(
            recipient_email=recipient_email,
            subject=subject,
            body=message,
            status='failed',
            error_message=str(e)
        )


@receiver(pre_save, sender=Appointment)
def capture_old_appointment(sender, instance, **kwargs):
    """Capture old appointment data before save"""
    if instance.pk:
        try:
            instance._old_instance = Appointment.objects.get(pk=instance.pk)
        except Appointment.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None


@receiver(post_save, sender=Appointment)
def appointment_notification_handler(sender, instance, created, **kwargs):
    """
    Handles all appointment notifications
    Triggers on: Create, Reschedule, Cancel, Status Change
    """
    
    # Get users
    doctor_user = instance.doctor.user
    patient_user = instance.patient.user
    
    # Get clinic name
    clinic_name = instance.clinic.name
    
    # Format appointment details
    appt_datetime = instance.scheduled_time
    appt_date = appt_datetime.strftime("%Y-%m-%d")
    appt_time = appt_datetime.strftime("%H:%M")
    
    # Common metadata
    meta = {
        'type': None,  # Will be set below
        'withName': None,  # Will be set below
        'clinic_name': clinic_name,
        'date': appt_date,
        'time': appt_time,
        'status': instance.status.title(),
        'created_at': timezone.now().isoformat()
    }
    
    # CASE 1: NEW APPOINTMENT BOOKED
    if created:
        action_type = "Appointment Booked"
        
        # Notify Doctor
        doctor_title = f"New Appointment: {patient_user.first_name} {patient_user.last_name}"
        doctor_message = f"Patient {patient_user.first_name} {patient_user.last_name} booked an appointment at {clinic_name} on {appt_date} at {appt_time}."
        meta['type'] = action_type
        meta['withName'] = f"{patient_user.first_name} {patient_user.last_name}"
        
        create_notification(
            user=doctor_user,
            title=doctor_title,
            message=doctor_message,
            notification_type='appointment_booked',
            meta=meta.copy()
        )
        
        send_notification_email(
            recipient_email=doctor_user.email,
            subject=f"Medicare: New Appointment - {patient_user.first_name} {patient_user.last_name}",
            message=f"""
Dear Dr. {doctor_user.last_name},

A new appointment has been booked:

Patient: {patient_user.first_name} {patient_user.last_name}
Clinic: {clinic_name}
Date: {appt_date}
Time: {appt_time}
Status: Booked

Please log in to your dashboard to view details.

Best regards,
Medicare Team
            """
        )
        
        # Notify Patient
        patient_title = "Appointment Confirmed"
        patient_message = f"Your appointment with Dr. {doctor_user.first_name} {doctor_user.last_name} at {clinic_name} on {appt_date} at {appt_time} is confirmed."
        meta['withName'] = f"Dr. {doctor_user.first_name} {doctor_user.last_name}"
        
        create_notification(
            user=patient_user,
            title=patient_title,
            message=patient_message,
            notification_type='appointment_booked',
            meta=meta.copy()
        )
        
        send_notification_email(
            recipient_email=patient_user.email,
            subject=f"Medicare: Appointment Confirmed with Dr. {doctor_user.last_name}",
            message=f"""
Dear {patient_user.first_name},

Your appointment has been confirmed:

Doctor: Dr. {doctor_user.first_name} {doctor_user.last_name}
Clinic: {clinic_name}
Date: {appt_date}
Time: {appt_time}
Status: Booked

Please arrive 10 minutes early.

Best regards,
Medicare Team
            """
        )
        
        logger.info(f"Appointment #{instance.id} booked - notifications sent")
        return
    
    # CASE 2: APPOINTMENT UPDATED (Reschedule or Cancel)
    if hasattr(instance, '_old_instance') and instance._old_instance:
        old = instance._old_instance
        
        # Check what changed
        status_changed = old.status != instance.status
        time_changed = old.scheduled_time != instance.scheduled_time
        
        # CASE 2A: CANCELLED
        if status_changed and instance.status == 'cancelled':
            action_type = "Appointment Cancelled"
            
            # Notify Doctor
            doctor_title = f"Appointment Cancelled: {patient_user.first_name} {patient_user.last_name}"
            doctor_message = f"Patient {patient_user.first_name} {patient_user.last_name}'s appointment at {clinic_name} on {appt_date} at {appt_time} has been cancelled."
            meta['type'] = action_type
            meta['withName'] = f"{patient_user.first_name} {patient_user.last_name}"
            
            create_notification(
                user=doctor_user,
                title=doctor_title,
                message=doctor_message,
                notification_type='appointment_cancelled',
                meta=meta.copy()
            )
            
            send_notification_email(
                recipient_email=doctor_user.email,
                subject=f"Medicare: Appointment Cancelled - {patient_user.first_name} {patient_user.last_name}",
                message=f"""
Dear Dr. {doctor_user.last_name},

An appointment has been cancelled:

Patient: {patient_user.first_name} {patient_user.last_name}
Clinic: {clinic_name}
Original Date: {appt_date}
Original Time: {appt_time}

The time slot is now available.

Best regards,
Medicare Team
                """
            )
            
            # Notify Patient
            patient_title = "Appointment Cancelled"
            patient_message = f"Your appointment with Dr. {doctor_user.first_name} {doctor_user.last_name} at {clinic_name} has been cancelled."
            meta['withName'] = f"Dr. {doctor_user.first_name} {doctor_user.last_name}"
            
            create_notification(
                user=patient_user,
                title=patient_title,
                message=patient_message,
                notification_type='appointment_cancelled',
                meta=meta.copy()
            )
            
            send_notification_email(
                recipient_email=patient_user.email,
                subject=f"Medicare: Appointment Cancellation Confirmed",
                message=f"""
Dear {patient_user.first_name},

Your appointment has been cancelled:

Doctor: Dr. {doctor_user.first_name} {doctor_user.last_name}
Clinic: {clinic_name}
Date: {appt_date}
Time: {appt_time}

You can book a new appointment anytime.

Best regards,
Medicare Team
                """
            )
            
            logger.info(f"Appointment #{instance.id} cancelled - notifications sent")
        
        # CASE 2B: RESCHEDULED
        elif time_changed:
            action_type = "Appointment Rescheduled"
            
            old_date = old.scheduled_time.strftime("%Y-%m-%d")
            old_time = old.scheduled_time.strftime("%H:%M")
            
            # Notify Doctor
            doctor_title = f"Appointment Rescheduled: {patient_user.first_name} {patient_user.last_name}"
            doctor_message = f"Patient {patient_user.first_name} {patient_user.last_name}'s appointment has been rescheduled from {old_date} {old_time} to {appt_date} {appt_time} at {clinic_name}."
            meta['type'] = action_type
            meta['withName'] = f"{patient_user.first_name} {patient_user.last_name}"
            
            create_notification(
                user=doctor_user,
                title=doctor_title,
                message=doctor_message,
                notification_type='appointment_rescheduled',
                meta=meta.copy()
            )
            
            send_notification_email(
                recipient_email=doctor_user.email,
                subject=f"Medicare: Appointment Rescheduled - {patient_user.first_name} {patient_user.last_name}",
                message=f"""
Dear Dr. {doctor_user.last_name},

An appointment has been rescheduled:

Patient: {patient_user.first_name} {patient_user.last_name}
Clinic: {clinic_name}

Previous Schedule:
Date: {old_date}
Time: {old_time}

New Schedule:
Date: {appt_date}
Time: {appt_time}

Best regards,
Medicare Team
                """
            )
            
            # Notify Patient
            patient_title = "Appointment Rescheduled"
            patient_message = f"Your appointment with Dr. {doctor_user.first_name} {doctor_user.last_name} has been rescheduled to {appt_date} at {appt_time} at {clinic_name}."
            meta['withName'] = f"Dr. {doctor_user.first_name} {doctor_user.last_name}"
            
            create_notification(
                user=patient_user,
                title=patient_title,
                message=patient_message,
                notification_type='appointment_rescheduled',
                meta=meta.copy()
            )
            
            send_notification_email(
                recipient_email=patient_user.email,
                subject=f"Medicare: Appointment Rescheduled with Dr. {doctor_user.last_name}",
                message=f"""
Dear {patient_user.first_name},

Your appointment has been rescheduled:

Doctor: Dr. {doctor_user.first_name} {doctor_user.last_name}
Clinic: {clinic_name}

Previous Schedule:
Date: {old_date}
Time: {old_time}

New Schedule:
Date: {appt_date}
Time: {appt_time}

Please mark your calendar accordingly.

Best regards,
Medicare Team
                """
            )
            
            logger.info(f"Appointment #{instance.id} rescheduled - notifications sent")