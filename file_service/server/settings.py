"""
Django settings for server project.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'backup_no_so_secret_key_@342FD-sfd_32q##424%234##33(32432@&^hvdr')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", 5672)
RABBITMQ_DEFAULT_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_DEFAULT_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "video_uploads")

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.contenttypes',  
    'django.contrib.auth',     
    'rest_framework',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'server.urls'

WSGI_APPLICATION = 'server.wsgi.application'


# FTP
FTP_SERVER_HOST = os.getenv("FTP_HOST","ftp-server")
FTP_SERVER_PORT = 21
FTP_SERVER_USER = os.getenv('FTP_USER_NAME', 'default_user')
FTP_SERVER_PASSWORD = os.getenv('FTP_USER_PASS', 'default_pass')
FTP_STORAGE_LOCATION = '/media'

# URL для доступа к файлам
FILE_SERVER_URL = os.getenv("FILE_SERVER_URL", "ftp://ftp-server/media/movies")


# RabbitMQ
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", 5672)
RABBITMQ_DEFAULT_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_DEFAULT_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "video_uploads")

DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760000

FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = False 
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'server.auth_backends.ExternalJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
}