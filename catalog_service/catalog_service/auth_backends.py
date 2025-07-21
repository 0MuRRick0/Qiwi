import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from jose import jwt, JWTError
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Настройки
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'backup_no_so_secret_key_@342FD-sfd_32q##424%234##33(32432@&^hvdr')
JWT_ALGORITHM = "HS256"
USER_SERVICE_URL = "http://user-service:8000/me/"
AUTH_HEADER_PREFIX = 'Bearer'


class ExternalUser:
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.username = user_data.get('username')
        self.is_authenticated = True
        self.payload = user_data

    def __str__(self):
        return self.username


class ExternalJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            raise AuthenticationFailed('Authorization header is missing.')

        parts = auth_header.split()

        if len(parts) != 2 or parts[0] != AUTH_HEADER_PREFIX:
            raise AuthenticationFailed(f'Invalid authorization header. Expected: "{AUTH_HEADER_PREFIX} <token>".')

        token = parts[1]

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except JWTError as e:
            raise AuthenticationFailed(f'Invalid or expired token: {str(e)}')

        headers = {
            'Authorization': f'{AUTH_HEADER_PREFIX} {token}'
        }

        try:
            response = requests.get(USER_SERVICE_URL, headers=headers)
        except requests.RequestException as e:
            raise AuthenticationFailed(f'User service is unreachable: {str(e)}')
        
    

        if response.status_code != 200:
            with open("my_file.txt", "w") as file:
                file.write(str(response.status_code))
                file.write(str(response.content))
            raise AuthenticationFailed('User not found in user service.')

        user_data = response.json()
        user = ExternalUser(user_data)

        return (user, token)