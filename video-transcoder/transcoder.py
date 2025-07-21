import os
import subprocess
from urllib.parse import urlparse
import ftputil
import logging
import tempfile
import shutil

logging.basicConfig(level=logging.INFO)

def transcode_and_upload(movie_id, file_url, ftp_host, ftp_user, ftp_pass):
    parsed_url = urlparse(file_url)
    path = parsed_url.path 
    filename = os.path.basename(path)
    file_dir = os.path.dirname(path) 

    base_name, ext = os.path.splitext(filename)
    transcoded_dir = os.path.join(file_dir, "transcoded")

    # Создаем временную директорию для хранения файлов
    temp_dir = tempfile.mkdtemp()
    logging.info(f"Создана временная директория: {temp_dir}")

    try:
        # Очищаем старые файлы на FTP
        with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
            if not ftp.path.exists(transcoded_dir):
                logging.info(f"Создаю папку на FTP: {transcoded_dir}")
                ftp.makedirs(transcoded_dir)
            
            ftp.chdir(transcoded_dir)
            files = ftp.listdir(transcoded_dir)
            
            for file in files:
                if file.endswith('.ts') or file.endswith('.m3u8'):
                    try:
                        logging.info(f"Удаляю файл на FTP: {file}")
                        ftp.remove(file)
                    except Exception as e:
                        logging.error(f"Не удалось удалить файл {file}: {e}")

        secure_ftp_url = f"ftp://{ftp_user}:{ftp_pass}@{parsed_url.hostname}{parsed_url.path}"
        logging.info(f"Используем URL с авторизацией: {secure_ftp_url}")

        transcode_cmd = [
            'ffmpeg',
            '-i', secure_ftp_url,
            
            # Важные параметры для сохранения целостности
            '-fflags', '+genpts+igndts',
            '-flags', '+global_header',
            '-strict', 'experimental',
            '-vsync', 'passthrough',
            
            # Фильтр-комплекс
            '-filter_complex',
            '[0:v]setpts=N/FRAME_RATE/TB,split=3[v1][v2][v3];'
            '[v1]scale=-2:480[480v];'
            '[v2]scale=-2:720[720v];'
            '[v3]scale=-2:1080[1080v]',
            
            # Общие параметры кодирования
            '-force_key_frames', 'expr:gte(n,n_forced*30)',
            '-g', '30',
            '-keyint_min', '30',
            '-sc_threshold', '0',
            '-avoid_negative_ts', 'make_zero',
            '-copyts',
            '-start_at_zero',
            
            # 480p вариант
            '-map', '[480v]', '-map', '0:a:0',
            '-c:v', 'libx264', '-preset', 'medium',
            '-b:v', '1000k', '-maxrate', '1000k', '-bufsize', '2000k',
            '-c:a', 'aac', '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_flags', 'independent_segments+discont_start+append_list',
            '-hls_playlist_type', 'vod',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', os.path.join(temp_dir, f'{base_name}_480_%03d.ts'),
            os.path.join(temp_dir, f'{base_name}_480.m3u8'),
            
            # 720p вариант
            '-map', '[720v]', '-map', '0:a:0',
            '-c:v', 'libx264', '-preset', 'medium',
            '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k',
            '-c:a', 'aac', '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_flags', 'independent_segments+discont_start+append_list',
            '-hls_playlist_type', 'vod',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', os.path.join(temp_dir, f'{base_name}_720_%03d.ts'),
            os.path.join(temp_dir, f'{base_name}_720.m3u8'),
            
            # 1080p вариант
            '-map', '[1080v]', '-map', '0:a:0',
            '-c:v', 'libx264', '-preset', 'medium',
            '-b:v', '5000k', '-maxrate', '5000k', '-bufsize', '10000k',
            '-c:a', 'aac', '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_flags', 'independent_segments+discont_start+append_list',
            '-hls_playlist_type', 'vod',
            '-hls_segment_type', 'mpegts',
            '-hls_segment_filename', os.path.join(temp_dir, f'{base_name}_1080_%03d.ts'),
            os.path.join(temp_dir, f'{base_name}_1080.m3u8')
        ]

        logging.info("Запускаю ffmpeg...")
        result = subprocess.run(transcode_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if result.returncode != 0:
            stderr = result.stderr.decode()
            logging.error(f"Ошибка при транскодировании: {stderr}")
            raise Exception(f"Ошибка транскодирования: {stderr}")

        logging.info("Транскодирование завершено. Загружаю файлы на FTP...")
        
        with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
            if not ftp.path.exists(transcoded_dir):
                ftp.makedirs(transcoded_dir)
            ftp.chdir(transcoded_dir)
            
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    local_path = os.path.join(root, file)
                    remote_path = os.path.join(transcoded_dir, file)
                    
                    try:
                        logging.info(f"Загружаю файл: {file}")
                        ftp.upload(local_path, remote_path)
                    except Exception as e:
                        logging.error(f"Ошибка при загрузке файла {file}: {e}")
                        raise

        logging.info("Создание master playlist...")
        master_playlist_content = f"""#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
{base_name}_480.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
{base_name}_720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
{base_name}_1080.m3u8
"""
        master_playlist_path = os.path.join(temp_dir, f"{base_name}_master.m3u8")
        with open(master_playlist_path, "w") as f:
            f.write(master_playlist_content)
        
        with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
            remote_path = f"{transcoded_dir}/{base_name}_master.m3u8"
            ftp.upload(master_playlist_path, remote_path)
        
        logging.info(f"Мастер-плейлист успешно создан и загружен: {remote_path}")
        return True

    except Exception as e:
        logging.error(f"Ошибка в процессе транскодирования/загрузки: {str(e)}")
        return False
    finally:
        try:
            shutil.rmtree(temp_dir)
            logging.info(f"Временная директория удалена: {temp_dir}")
        except Exception as e:
            logging.error(f"Ошибка при удалении временной директории: {e}")