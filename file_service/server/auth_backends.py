import requests
from jose import jwt, JWTError
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")

USER_SERVICE_PRIVILEGES_URL = getattr(
    settings, "USER_SERVICE_PRIVILEGES_URL", "http://user-service:8000/privileges/"
)
AUTH_HEADER_PREFIX = getattr(settings, "AUTH_HEADER_PREFIX", "Bearer")

USER_SERVICE_TIMEOUT = getattr(settings, "USER_SERVICE_TIMEOUT", 10)


class ExternalUser:
    """
    Кастомный объект пользователя для DRF, представляющий пользователя из внешнего сервиса.
    """

    def __init__(self, token_payload_data, privileges_data):

        self.id = token_payload_data.get("user_id")
        self.username = token_payload_data.get("username")
        self.email = token_payload_data.get("email")

        self.is_staff = privileges_data.get("is_staff", False)
        self.is_superuser = privileges_data.get("is_superuser", False)

        self.is_authenticated = True

        self.token_payload = token_payload_data
        self.privileges_data = privileges_data

    def __str__(self):
        return self.username or f"User ID {self.id}"


class ExternalJWTAuthentication(BaseAuthentication):
    """
    Кастомный бэкенд аутентификации для DRF.
    Проверяет JWT токен, декодирует его локально, затем запрашивает привилегии у user-service.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != AUTH_HEADER_PREFIX:
            raise AuthenticationFailed(
                f'Invalid authorization header. Expected: "{AUTH_HEADER_PREFIX} <token>".'
            )

        token = parts[1]

        try:

            payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f"Invalid token: {str(e)}")

        user_id_from_token = payload.get("user_id")
        username_from_token = payload.get("username")
        email_from_token = payload.get("email")

        if not user_id_from_token or not username_from_token:
            raise AuthenticationFailed(
                "Token payload is missing required user information (user_id, username)."
            )

        token_user_data = {
            "user_id": user_id_from_token,
            "username": username_from_token,
            "email": email_from_token,
        }

        headers = {"Authorization": f"{AUTH_HEADER_PREFIX} {token}"}
        try:

            response = requests.get(
                USER_SERVICE_PRIVILEGES_URL,
                headers=headers,
                timeout=USER_SERVICE_TIMEOUT,
            )
        except requests.RequestException as e:

            raise AuthenticationFailed(f"User service is unreachable: {str(e)}")

        if response.status_code != 200:

            raise AuthenticationFailed(
                f"Access denied by user service. Status: {response.status_code}"
            )

        try:
            privileges_data = response.json()
        except ValueError:
            raise AuthenticationFailed("Invalid JSON response from user service.")

        if "is_staff" not in privileges_data or "is_superuser" not in privileges_data:
            raise AuthenticationFailed(
                "User service response missing is_staff/is_superuser fields."
            )

        user = ExternalUser(token_user_data, privileges_data)

        return (user, token)

    def authenticate_header(self, request):
        return AUTH_HEADER_PREFIX
