# backend/notifications/urls.py
from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationClearAllView,
    UnreadCountView,
)

urlpatterns = [
    # List all notifications
    path('', NotificationListView.as_view(), name='notification-list'),
    
    # Mark specific notification as read
    path('<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    
    # Mark all notifications as read
    path('mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    
    # Delete specific notification
    path('<int:pk>/delete/', NotificationDeleteView.as_view(), name='notification-delete'),
    
    # Clear all notifications
    path('clear-all/', NotificationClearAllView.as_view(), name='notification-clear-all'),
    
    # Get unread count
    path('unread-count/', UnreadCountView.as_view(), name='notification-unread-count'),
]