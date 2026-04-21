# backend/notifications/migrations/0001_initial.py
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[
                    ('appointment_booked', 'Appointment Booked'),
                    ('appointment_rescheduled', 'Appointment Rescheduled'),
                    ('appointment_cancelled', 'Appointment Cancelled'),
                    ('appointment_completed', 'Appointment Completed'),
                    ('reminder', 'Reminder'),
                    ('system', 'System')
                ], max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recipient_email', models.EmailField(max_length=254)),
                ('subject', models.CharField(max_length=255)),
                ('body', models.TextField()),
                ('notification_type', models.CharField(blank=True, max_length=50)),
                ('status', models.CharField(choices=[
                    ('sent', 'Sent'),
                    ('failed', 'Failed'),
                    ('pending', 'Pending')
                ], default='pending', max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', '-created_at'], name='notificatio_recipie_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='notificatio_recipie_idx2'),
        ),
        migrations.AddIndex(
            model_name='emaillog',
            index=models.Index(fields=['recipient_email', '-created_at'], name='emaillog_recipie_idx'),
        ),
        migrations.AddIndex(
            model_name='emaillog',
            index=models.Index(fields=['status'], name='emaillog_status_idx'),
        ),
    ]