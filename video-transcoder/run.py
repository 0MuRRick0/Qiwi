import os
import json
import pika
import logging
from urllib.parse import urlparse
from transcoder import transcode_and_upload
import time

logging.basicConfig(level=logging.INFO)

# RabbitMQ env
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "transcode_queue")


RETRY_DELAY = 10
MAX_RETRIES = None

def start_consumer():
    retries = 0

    while MAX_RETRIES is None or retries < MAX_RETRIES:
        try:
            logging.info("Попытка подключения к RabbitMQ...")

            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
            parameters = pika.ConnectionParameters(
                host=RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300 
            )

            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)

            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body)
                    movie_id = data.get("movie_id")
                    file_url = data.get("file_url")
                    ftp_user = data.get("ftp_user")
                    ftp_password = data.get("ftp_password")

                    if not all([movie_id, file_url, ftp_user, ftp_password]):
                        logging.error("Недостающие данные в сообщении")
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                        return

                    parsed_url = urlparse(file_url)
                    ftp_host = parsed_url.hostname

                    if not ftp_host:
                        logging.error("Не удалось определить хост из file_url")
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                        return

                    logging.info(f"Получено сообщение: movie_id={movie_id}, host={ftp_host}, file_url={file_url}")

                    transcode_and_upload(movie_id, file_url, ftp_host, ftp_user, ftp_password)

                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logging.error(f"Ошибка при обработке сообщения: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=RABBITMQ_QUEUE, on_message_callback=callback)

            logging.info("Ожидание сообщений из RabbitMQ...")
            logging.info("Для выхода нажмите CTRL+C")
            channel.start_consuming()

        
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker) as e:
            logging.error(f"Ошибка соединения с RabbitMQ: {e}")
            retries += 1
            logging.info(f"Повторная попытка #{retries} через {RETRY_DELAY} секунд...")
            time.sleep(RETRY_DELAY)

        # Обработка других ошибок
        except Exception as e:
            logging.error(f"Непредвиденная ошибка: {e}")
            retries += 1
            logging.info(f"Повторная попытка #{retries} через {RETRY_DELAY} секунд...")
            time.sleep(RETRY_DELAY)

    logging.error("Достигнуто максимальное количество попыток. Выход.")

if __name__ == "__main__":
    start_consumer()