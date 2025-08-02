import os
import pika
import json
import ftplib
from ftplib import FTP
import ftputil
import logging
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from rest_framework.decorators import permission_classes
from rest_framework import status
from urllib.parse import urlparse
from server import settings
from server.permissions import IsAdminOrSuperUser

logger = logging.getLogger(__name__)


def send_to_rabbitmq(movie_id, file_url):
    ftp_user = settings.FTP_SERVER_USER
    ftp_password = settings.FTP_SERVER_PASSWORD
    try:
        credentials = pika.PlainCredentials(
            settings.RABBITMQ_DEFAULT_USER, settings.RABBITMQ_DEFAULT_PASS
        )
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials,
            )
        )
        channel = connection.channel()

        channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)

        message = json.dumps(
            {
                "movie_id": movie_id,
                "file_url": file_url,
                "ftp_user": ftp_user,
                "ftp_password": ftp_password,
            }
        )

        channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=message,
            properties=pika.BasicProperties(delivery_mode=2),
        )
        connection.close()
        logger.info(
            f"Сообщение для фильма {movie_id} успешно отправлено в RabbitMQ: {file_url}"
        )
    except Exception as e:
        logger.error(f"Ошибка при отправке в RabbitMQ для фильма {movie_id}: {e}")


@permission_classes([IsAdminOrSuperUser])
class UploadFileView(APIView):

    FILE_MAP = {"film": "m", "poster": "p", "trailer": "t"}

    def post(self, request, movie_id, content_type):
        logger.info(
            f"Получен запрос на загрузку файла для movie_id={movie_id}, content_type={content_type}"
        )

        if content_type not in self.FILE_MAP:
            logger.warning(f"Неверный content_type: {content_type}")
            return JsonResponse({"error": "Invalid content_type"}, status=400)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            logger.warning("Файл не предоставлен в запросе")
            return JsonResponse({"error": "No file provided"}, status=400)

        ext = os.path.splitext(uploaded_file.name)[1].lower()
        allowed_formats = {
            "m": [".mp4", ".mkv", ".avi"],
            "t": [".mp4", ".mov", ".webm"],
            "p": [".jpg", ".jpeg", ".png"],
        }

        filename = self.FILE_MAP[content_type]
        if ext not in allowed_formats[filename]:
            logger.warning(f"Неверный формат файла {ext} для типа {content_type}")
            return JsonResponse(
                {
                    "error": f'Invalid file format for {content_type}. Allowed formats: {", ".join(allowed_formats[filename])}'
                },
                status=400,
            )

        remote_dir = f"{settings.FTP_STORAGE_LOCATION}/movies/{movie_id}"
        remote_path = f"{remote_dir}/{filename}{ext}"
        logger.debug(f"Целевая директория на FTP: {remote_dir}")
        logger.debug(f"Целевой путь на FTP: {remote_path}")

        try:
            with FTP() as ftp:
                logger.debug(
                    f"Подключение к FTP {settings.FTP_SERVER_HOST}:{settings.FTP_SERVER_PORT}..."
                )
                ftp.connect(settings.FTP_SERVER_HOST, settings.FTP_SERVER_PORT)
                ftp.set_pasv(True)
                ftp.login(settings.FTP_SERVER_USER, settings.FTP_SERVER_PASSWORD)
                logger.debug("Успешное подключение к FTP")

                logger.debug(f"Проверка/создание директории {remote_dir}")
                self._ensure_ftp_dir(ftp, remote_dir)

                logger.debug(f"Начало загрузки файла {uploaded_file.name}")
                uploaded_file.seek(0)
                ftp.storbinary(
                    f"STOR {remote_path}", uploaded_file.file, blocksize=1024 * 1024
                )
                logger.info(f"Файл успешно загружен на FTP: {remote_path}")

            file_url = f"{settings.FILE_SERVER_URL}/{movie_id}/{filename}"

            if content_type == "film":
                logger.debug(f"Отправка сообщения в RabbitMQ для фильма {movie_id}")
                send_to_rabbitmq(movie_id, f"{file_url}{ext}")

            logger.info(
                f"Загрузка завершена успешно для movie_id={movie_id}, content_type={content_type}"
            )
            return JsonResponse({"movie_id": movie_id, "file_url": f"{file_url}{ext}"})

        except Exception as e:
            logger.error(
                f"Ошибка при загрузке файла для movie_id={movie_id}, content_type={content_type}: {e}",
                exc_info=True,
            )
            return JsonResponse({"error": str(e)}, status=500)

    def _ensure_ftp_dir(self, ftp, path):
        directories = path.strip("/").split("/")
        current = ""
        for dir in directories:
            if not dir:
                continue
            current += "/" + dir
            try:
                ftp.cwd(current)
                logger.debug(f"Директория существует: {current}")
            except ftplib.error_perm:
                logger.debug(f"Создание директории: {current}")
                ftp.mkd(current)
                ftp.cwd(current)
                logger.debug(f"Директория создана и выбрана: {current}")
            except Exception as e:
                logger.error(
                    f"Неожиданная ошибка при работе с директорией {current}: {e}"
                )
                raise


def _delete_original_video_files(
    ftp_host: str, ftp_user: str, ftp_pass: str, base_path: str, movie_id: int
):
    """Удаляет оригинальные видеофайлы."""
    original_video_names = [f"m{ext}" for ext in [".mp4", ".mkv", ".avi"]]
    deleted_any = False

    with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
        for fname in original_video_names:
            original_video_path = f"{base_path}/{fname}"
            if not ftp.path.exists(original_video_path):
                logger.info(f"Оригинальный видеофайл не найден: {original_video_path}")
                continue

            try:
                ftp.remove(original_video_path)
                logger.info(f"Удален оригинальный видеофайл: {original_video_path}")
                deleted_any = True
            except Exception as e:
                logger.error(
                    f"Ошибка при удалении оригинального видеофайла {original_video_path}: {e}"
                )

    return deleted_any


def _delete_transcoded_files(
    startswith: str,
    ftp_host: str,
    ftp_user: str,
    ftp_pass: str,
    base_path: str,
    movie_id: int,
):
    transcoded_dir = f"{base_path}/transcoded"
    deleted_count = 0

    with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:

        if not ftp.path.exists(transcoded_dir):
            logger.info(f"Папка транскодированных файлов не найдена: {transcoded_dir}")
            return 0
        if not ftp.path.isdir(transcoded_dir):
            logger.info(f"Путь {transcoded_dir} не является директорией")
            return 0

        logger.info(f"Просмотр директории транскодированных файлов: {transcoded_dir}")

        try:
            items = ftp.listdir(transcoded_dir)
        except Exception as list_err:
            logger.error(
                f"Ошибка при получении списка файлов из {transcoded_dir}: {list_err}"
            )
            return 0

        logger.debug(f"Найдено элементов в {transcoded_dir}: {items}")

        for item in items:
            item_path = ftp.path.join(transcoded_dir, item)

            if not (ftp.path.isfile(item_path) and item.startswith(startswith)):
                continue

            try:
                ftp.remove(item_path)
                logger.info(f"Удален транскодированный файл: {item_path}")
                deleted_count += 1
            except Exception as e:
                logger.warning(
                    f"Не удалось удалить транскодированный файл {item_path}: {e}"
                )

        logger.info(
            f"Удалено {deleted_count} транскодированных файлов из {transcoded_dir}"
        )

        _remove_empty_dir(ftp, transcoded_dir)

    return deleted_count


def _remove_empty_dir(ftp, transcoded_dir: str):
    """Удаляет пустую директорию, если она существует."""
    try:
        remaining_items = ftp.listdir(transcoded_dir)
        if not remaining_items:
            logger.info(
                f"Папка транскодированных файлов {transcoded_dir} пуста, попытка удаления папки."
            )
            ftp.rmdir(transcoded_dir)
            logger.info(
                f"Удалена пустая папка транскодированных файлов: {transcoded_dir}"
            )
            return True
        else:
            logger.info(
                f"Папка транскодированных файлов {transcoded_dir} не пуста, оставлено {len(remaining_items)} элементов."
            )
            return False
    except Exception as e:
        logger.warning(f"Ошибка при проверке/удалении папки {transcoded_dir}: {e}")
        return False


def _delete_simple_file(
    ftp_host: str, ftp_user: str, ftp_pass: str, base_path: str, file_type: str
):
    """Удаляет простой файл (постер или трейлер)."""
    file_names_map = {"p": ["p.jpg"], "t": ["t.mp4"]}

    file_names = file_names_map.get(file_type, [])
    if not file_names:
        logger.warning(f"Неизвестный тип файла для удаления: {file_type}")
        return False

    deleted_any = False
    with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
        for fname in file_names:
            full_path = f"{base_path}/{fname}"
            if not ftp.path.exists(full_path):
                logger.info(f"Файл для удаления не найден: {full_path}")
                continue

            try:
                ftp.remove(full_path)
                logger.info(f"Удален файл: {full_path}")
                deleted_any = True
            except Exception as e:
                logger.error(f"Ошибка при удалении файла {full_path}: {e}")

    return deleted_any


def delete_movie_files_from_ftp(
    movie_id: int, file_type: str, ftp_host: str, ftp_user: str, ftp_pass: str
) -> bool:
    """
    Удаляет файлы, связанные с фильмом, с FTP-сервера.
    Для 'm' (видео) удаляет оригинальный файл и транскодированные файлы, начинающиеся с 'm'.
    Для 'p' (постер) и 't' (трейлер) удаляет только указанный файл.
    """
    base_path = f"{settings.FTP_STORAGE_LOCATION}/movies/{movie_id}"
    logger.info(
        f"Начало удаления файлов для movie_id={movie_id}, тип={file_type}, базовый путь={base_path}"
    )

    delete_status = True

    try:
        if file_type == "m":

            delete_status = _delete_original_video_files(
                ftp_host, ftp_user, ftp_pass, base_path, movie_id
            )

            delete_status = _delete_transcoded_files(
                "m", ftp_host, ftp_user, ftp_pass, base_path, movie_id
            )

        elif file_type in ["p", "t"]:

            delete_status = _delete_simple_file(
                ftp_host, ftp_user, ftp_pass, base_path, file_type
            )

        else:
            logger.warning(f"Неизвестный тип файла для удаления: {file_type}")
            return False

        if delete_status:
            logger.info(
                f"Завершено удаление файлов для movie_id={movie_id}, тип={file_type}"
            )
        return delete_status

    except Exception as e:
        logger.error(
            f"Ошибка при удалении файлов фильма {movie_id} типа {file_type} с FTP: {e}"
        )
        return False


@permission_classes([IsAdminOrSuperUser])
class DeleteFileView(APIView):
    CONTENT_TYPE_MAP = {"film": "m", "poster": "p", "trailer": "t"}

    def delete(self, request, movie_id, content_type):
        internal_file_type = self.CONTENT_TYPE_MAP.get(content_type)
        if not internal_file_type:
            if content_type in ["m", "p", "t"]:
                internal_file_type = content_type
            else:
                return JsonResponse(
                    {
                        "error": "Неверный тип контента. Допустимые значения: film, poster, trailer (или m, p, t)"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        ftp_host = settings.FTP_SERVER_HOST
        ftp_user = settings.FTP_SERVER_USER
        ftp_pass = settings.FTP_SERVER_PASSWORD

        if not all([ftp_host, ftp_user, ftp_pass]):
            logging.error(
                "Не заданы параметры подключения к FTP (FTP_SERVER_HOST, FTP_SERVER_USER, FTP_SERVER_PASSWORD)"
            )
            return JsonResponse(
                {"error": "Ошибка конфигурации сервера: Не заданы параметры FTP"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            success = delete_movie_files_from_ftp(
                movie_id, internal_file_type, ftp_host, ftp_user, ftp_pass
            )

            if success:
                logging.info(
                    f"Файлы типа '{internal_file_type}' для фильма ID {movie_id} успешно удалены с FTP."
                )
                return JsonResponse(
                    {
                        "message": f"Файлы типа '{content_type}' для фильма успешно удалены."
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                logging.warning(
                    f"Не удалось удалить файлы типа '{internal_file_type}' для фильма ID {movie_id}."
                )
                return JsonResponse(
                    {"error": f"Не удалось удалить файлы типа '{content_type}'."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            logging.error(
                f"Ошибка в DeleteFileView при удалении movie_id={movie_id}, content_type={content_type}: {e}",
                exc_info=True,
            )
            return JsonResponse(
                {"error": "Внутренняя ошибка сервера при удалении файла"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _remove_movie_folder(
    ftp_host: str, ftp_user: str, ftp_pass: str, base_path: str, movie_id: int
) -> bool:
    """
    Удаляет папку фильма, если она существует и пуста.
    Сначала пытается удалить папку 'transcoded' внутри неё, используя _remove_empty_dir.
    Затем проверяет, пуста ли сама папка фильма, и удаляет её.
    """
    logger.info(f"Попытка удаления папки фильма: {base_path}")
    folder_deleted = False
    try:
        with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:

            transcoded_dir = f"{base_path}/transcoded"

            if ftp.path.exists(transcoded_dir) and ftp.path.isdir(transcoded_dir):
                _remove_empty_dir(ftp, transcoded_dir)

            if not ftp.path.exists(base_path):
                logger.info(f"Папка фильма {base_path} не существует на FTP.")
                return True
            if not ftp.path.isdir(base_path):
                logger.warning(
                    f"Путь {base_path} существует, но не является директорией."
                )
                return False

            try:
                items = ftp.listdir(base_path)
                if not items:
                    logger.info(f"Папка фильма {base_path} пуста, пробуем удалить.")
                    ftp.rmdir(base_path)
                    folder_deleted = True
                    logger.info(f"Папка фильма {base_path} успешно удалена.")
                else:
                    logger.warning(
                        f"Папка фильма {base_path} не пуста. Удаление невозможно. Оставшиеся элементы: {items}"
                    )

            except Exception as list_err:
                logger.error(
                    f"Ошибка при проверке содержимого папки фильма {base_path}: {list_err}"
                )

    except Exception as e:
        logger.error(
            f"Ошибка при попытке удаления папки фильма {base_path} (movie_id={movie_id}): {e}",
            exc_info=True,
        )

    return folder_deleted


class DeleteAllMovieFilesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperUser]
    FILE_TYPES_TO_DELETE = ["m", "p", "t"]

    def delete(self, request, movie_id):
        """
        Обрабатывает DELETE-запрос для удаления всех файлов фильма и его папки.
        """
        ftp_host = getattr(settings, "FTP_SERVER_HOST", None)
        ftp_user = getattr(settings, "FTP_SERVER_USER", None)
        ftp_pass = getattr(settings, "FTP_SERVER_PASSWORD", None)

        if not all([ftp_host, ftp_user, ftp_pass]):
            logger.error(
                "Не заданы параметры подключения к FTP "
                "(FTP_SERVER_HOST, FTP_SERVER_USER, FTP_SERVER_PASSWORD)"
            )
            return JsonResponse(
                {"error": ("Ошибка конфигурации сервера: " "Не заданы параметры FTP")},
                status=500,
            )

        base_path = f"{settings.FTP_STORAGE_LOCATION}/movies/{movie_id}"
        logger.info(
            f"Начало удаления всех файлов и папки для movie_id={movie_id}, базовый путь={base_path}"
        )

        deletion_results = {}
        files_deleted_successfully = True

        logger.info(f"Начало удаления отдельных типов файлов для movie_id={movie_id}")
        for file_type in self.FILE_TYPES_TO_DELETE:
            try:
                success = delete_movie_files_from_ftp(
                    movie_id=movie_id,
                    file_type=file_type,
                    ftp_host=ftp_host,
                    ftp_user=ftp_user,
                    ftp_pass=ftp_pass,
                )
                deletion_results[file_type] = success

                if success:
                    logger.info(
                        f"Процесс удаления файлов типа '{file_type}' "
                        f"для фильма ID {movie_id} завершен."
                    )
                else:
                    logger.info(
                        f"Процесс удаления файлов типа '{file_type}' "
                        f"для фильма ID {movie_id} не нашел файлов для удаления или завершился без действий."
                    )

            except Exception as e:
                deletion_results[file_type] = False
                files_deleted_successfully = False
                logger.error(
                    f"Ошибка при вызове функции удаления файлов типа '{file_type}' "
                    f"для фильма ID {movie_id}: {e}",
                    exc_info=True,
                )

        folder_deleted = False
        if files_deleted_successfully:
            folder_deleted = _remove_movie_folder(
                ftp_host, ftp_user, ftp_pass, base_path, movie_id
            )
        else:
            logger.warning(
                f"Пропуск удаления папки фильма {base_path} из-за ошибок при удалении файлов."
            )

        all_files_results = list(deletion_results.values())
        all_files_handled = all_files_results and all(
            r is not False for r in all_files_results
        )

        if files_deleted_successfully and folder_deleted:
            message = f"Все файлы и папка для фильма ID {movie_id} успешно удалены."
            logger.info(message)
            return JsonResponse({"message": message}, status=200)

        elif files_deleted_successfully and not folder_deleted:

            message = (
                f"Файлы для фильма ID {movie_id} обработаны. "
                f"Папка {base_path} не была удалена (возможно, не пуста или не существует). "
                f"Результаты удаления файлов: {deletion_results}"
            )
            logger.warning(message)
            return JsonResponse(
                {
                    "message": "Операция завершена частично.",
                    "details": message,
                    "results": deletion_results,
                },
                status=200,
            )
        else:

            message = (
                f"Удаление некоторых файлов или папки для фильма ID {movie_id} не удалось. "
                f"Результаты удаления файлов: {deletion_results}"
            )
            logger.error(message)
            return JsonResponse(
                {
                    "error": "Не удалось полностью выполнить операцию удаления.",
                    "details": message,
                    "results": deletion_results,
                },
                status=500,
            )
