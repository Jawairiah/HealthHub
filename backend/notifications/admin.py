from django.contrib import admin
from notifications.models import Notification, EmailLog

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'recipient__email']
    readonly_fields = ['created_at', 'read_at']
    ordering = ['-created_at']

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient_email', 'subject', 'notification_type', 'status', 'sent_at']
    list_filter = ['status', 'notification_type', 'created_at']
    search_fields = ['recipient_email', 'subject']
    readonly_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']