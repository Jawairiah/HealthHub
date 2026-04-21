# backend/notifications/serializers.py
from rest_framework import serializers
from .models import Notification, EmailLog


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for in-app notifications"""
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'meta',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def to_representation(self, instance):
        """Custom representation to match frontend format"""
        data = super().to_representation(instance)
        
        # Add computed fields from meta if they exist
        if instance.meta:
            data['withName'] = instance.meta.get('withName')
            data['clinic_name'] = instance.meta.get('clinic_name')
            data['date'] = instance.meta.get('date')
            data['time'] = instance.meta.get('time')
            data['status'] = instance.meta.get('status')
        
        # Rename is_read to read for frontend compatibility
        data['read'] = data.pop('is_read')
        
        return data


class EmailLogSerializer(serializers.ModelSerializer):
    """Serializer for email logs (admin only)"""
    
    class Meta:
        model = EmailLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'sent_at']