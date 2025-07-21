FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py createsuperuser --noinput && gunicorn --bind 0.0.0.0:8000 user_service.wsgi:application"]