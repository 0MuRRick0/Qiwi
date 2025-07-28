import os
import pika
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from rest_framework.decorators import permission_classes
import json
import os
import ftplib
from urllib.parse import urlparse
import ftputil
from ftplib import FTP
from server import settings
from server.permissions import IsAdminOrSuperUser

def send_to_rabbitmq(movie_id, file_url):
    ftp_user = settings.FTP_SERVER_USER
    ftp_password = settings.FTP_SERVER_PASSWORD
    try:
        credentials = pika.PlainCredentials(settings.RABBITMQ_DEFAULT_USER, settings.RABBITMQ_DEFAULT_PASS)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=settings.RABBITMQ_HOST, port=settings.RABBITMQ_PORT, credentials=credentials)
        )
        channel = connection.channel()

        channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)

        message = json.dumps({
            "movie_id": movie_id,
            "file_url": file_url,
            "ftp_user": ftp_user,
            "ftp_password": ftp_password
        })

        channel.basic_publish(
            exchange='',
            routing_key=settings.RABBITMQ_QUEUE,
            body=message,
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
    except Exception as e:
        print(f"Ошибка при отправке в RabbitMQ: {e}")

@permission_classes([IsAdminOrSuperUser])
class UploadFileView(APIView):

    FILE_MAP = {
        'film': 'm',
        'poster': 'p',
        'trailer': 't'
    }

    def post(self, request, movie_id, content_type):
        if content_type not in self.FILE_MAP:
            return JsonResponse({'error': 'Invalid content_type'}, status=400)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({'error': 'No file provided'}, status=400)

        
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        allowed_formats = {
            'm': ['.mp4', '.mkv', '.avi'],
            't': ['.mp4', '.mov', '.webm'],
            'p': ['.jpg', '.jpeg', '.png']
        }

        filename = self.FILE_MAP[content_type]
        if ext not in allowed_formats[filename]:
            return JsonResponse({
                'error': f'Invalid file format for {content_type}. Allowed formats: {", ".join(allowed_formats[filename])}'
            }, status=400)

        
        remote_dir = f"{settings.FTP_STORAGE_LOCATION}/movies/{movie_id}"
        remote_path = f"{remote_dir}/{filename}{ext}"

        try:
            
            with FTP() as ftp:
                ftp.connect(settings.FTP_SERVER_HOST, settings.FTP_SERVER_PORT)
                ftp.set_pasv(True)
                ftp.login(settings.FTP_SERVER_USER, settings.FTP_SERVER_PASSWORD)

                
                self._ensure_ftp_dir(ftp, remote_dir)

                
                uploaded_file.seek(0)
                ftp.storbinary(f"STOR {remote_path}", uploaded_file.file, blocksize=1024 * 1024)

            
            file_url = f"{settings.FILE_SERVER_URL}/{movie_id}/{filename}"

            
            if content_type == 'film':
                send_to_rabbitmq(movie_id, f"{file_url}{ext}")

            return JsonResponse({
                'movie_id': movie_id,
                'file_url': f"{file_url}{ext}"
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    def _ensure_ftp_dir(self, ftp, path):
        """Создаёт директорию на FTP, если её нет"""
        directories = path.strip("/").split("/")
        current = ""
        for dir in directories:
            if not dir:
                continue
            current += "/" + dir
            try:
                ftp.cwd(current)
            except:
                ftp.mkd(current)
                ftp.cwd(current)