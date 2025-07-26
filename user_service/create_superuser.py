import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

User = get_user_model()

superuser_email = os.getenv('DJANGO_SUPERUSER_EMAIL')
superuser_username = os.getenv('DJANGO_SUPERUSER_USERNAME')
superuser_password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

print(f"EMAIL: {superuser_email}", flush=True)
print(f"USERNAME: {superuser_username}", flush=True)
print(f"PASSWORD: {'*' * len(superuser_password) if superuser_password else 'None'}", flush=True)

if not superuser_email or not superuser_username or not superuser_password:
    print("Superuser credentials not provided in environment variables", flush=True)
    exit(1)

print(f"Checking if user with email {superuser_email} exists...", flush=True)
user_exists = User.objects.filter(email=superuser_email).exists()
print(f"User exists: {user_exists}", flush=True)

if not user_exists:
    print("Creating superuser...", flush=True)
    try:
        User.objects.create_superuser(
            email=superuser_email,
            username=superuser_username,
            password=superuser_password
        )
        print(f"Superuser {superuser_username} created successfully", flush=True)
    except Exception as e:
        print(f"Error creating superuser: {e}", flush=True)
else:
    print(f"Superuser with email {superuser_email} already exists", flush=True)