from django.apps import AppConfig

class AppointmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'appointments'
    
    def ready(self):
        """Import signals when app is ready"""
        import appointments.signals  # ✅ ADD THIS