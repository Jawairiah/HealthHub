# backend/notifications/views.py
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    GET: List all notifications for current user
    - Returns unread notifications first
    - Includes all notification metadata
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Get all notifications for current user
        notifications = Notification.objects.filter(recipient=request.user)
        
        # Apply filters if provided
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() in ['true', '1', 'yes']
            notifications = notifications.filter(is_read=is_read_bool)
        
        notification_type = request.query_params.get('type')
        if notification_type:
            notifications = notifications.filter(notification_type=notification_type)
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationMarkReadView(APIView):
    """
    POST: Mark a specific notification as read
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk, 
                recipient=request.user
            )
            
            if not notification.is_read:
                notification.mark_as_read()
            
            serializer = NotificationSerializer(notification)
            return Response(serializer.data)
            
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationMarkAllReadView(APIView):
    """
    POST: Mark all notifications as read for current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{count} notification(s) marked as read',
            'count': count
        })


class NotificationDeleteView(APIView):
    """
    DELETE: Delete a specific notification
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                recipient=request.user
            )
            notification.delete()
            
            return Response({
                'message': 'Notification deleted successfully'
            })
            
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationClearAllView(APIView):
    """
    POST: Clear all notifications for current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user
        ).delete()[0]
        
        return Response({
            'message': f'{count} notification(s) cleared',
            'count': count
        })


class UnreadCountView(APIView):
    """
    GET: Get count of unread notifications
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        return Response({
            'count': count
        })