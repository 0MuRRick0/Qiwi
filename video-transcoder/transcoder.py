import os
import subprocess
from urllib.parse import urlparse
import ftputil
import logging

logging.basicConfig(level=logging.INFO)

def transcode_and_upload(movie_id, file_url, ftp_host, ftp_user, ftp_pass):
    parsed_url = urlparse(file_url)
    path = parsed_url.path 
    filename = os.path.basename(path)
    file_dir = os.path.dirname(path) 

    base_name, ext = os.path.splitext(filename)

    transcoded_dir = os.path.join(file_dir, "transcoded")

    with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
        if not ftp.path.exists(transcoded_dir):
            logging.info(f"Создаю папку: {transcoded_dir}")
            ftp.makedirs(transcoded_dir)

    secure_ftp_url = f"ftp://{ftp_user}:{ftp_pass}@{parsed_url.hostname}{parsed_url.path}"
    logging.info(f"Используем URL с авторизацией: {secure_ftp_url}")

    transcode_cmd = [
        'ffmpeg',
        '-i', secure_ftp_url,
        
        # Важные параметры для сохранения целостности
        '-fflags', '+genpts+igndts',  # Генерация PTS и игнорирование DTS
        '-flags', '+global_header',
        '-strict', 'experimental',
        '-vsync', 'passthrough',      # Сохраняем оригинальные временные метки
        
        # Фильтр-комплекс с сохранением всех кадров
        '-filter_complex',
        '[0:v]setpts=N/FRAME_RATE/TB,split=3[v1][v2][v3];'
        '[v1]scale=-2:480[480v];'
        '[v2]scale=-2:720[720v];'
        '[v3]scale=-2:1080[1080v]',
        
        # Общие параметры кодирования
        '-force_key_frames', 'expr:gte(n,n_forced*30)',  # Ключевой кадр каждые 30 кадров
        '-g', '30',                # GOP size = 30 кадров
        '-keyint_min', '30',       # Минимальный GOP
        '-sc_threshold', '0',      # Отключаем автоматическое определение сцен
        
        # Параметры для сохранения всех кадров
        '-avoid_negative_ts', 'make_zero',
        '-copyts',                # Сохраняем оригинальные временные метки
        '-start_at_zero',         # Начинаем с нуля
        
        # 480p вариант
        '-map', '[480v]', '-map', '0:a:0',
        '-c:v', 'libx264', '-preset', 'medium',
        '-b:v', '1000k', '-maxrate', '1000k', '-bufsize', '2000k',
        '-c:a', 'aac', '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_flags', 'independent_segments+discont_start+append_list',
        '-hls_playlist_type', 'vod',
        '-hls_segment_type', 'mpegts',  # Явно указываем тип сегментов
        '-hls_segment_filename', f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_480_%03d.ts',
        f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_480.m3u8',
        
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
        '-hls_segment_filename', f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_720_%03d.ts',
        f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_720.m3u8',
        
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
        '-hls_segment_filename', f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_1080_%03d.ts',
        f'ftp://{ftp_user}:{ftp_pass}@{ftp_host}{transcoded_dir}/{base_name}_1080.m3u8'
    ]

    logging.info("Запускаю ffmpeg...")
    result = subprocess.run(transcode_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if result.returncode != 0:
        stderr = result.stderr.decode()
        logging.error(f"Ошибка при транскодировании: {stderr}")
    else:
        logging.info(f"Файл успешно транскодирован и загружен: {transcoded_dir}")
    
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
    try:
        temp_file = f"{base_name}_master.m3u8"
        with open(temp_file, "w") as f:
            f.write(master_playlist_content)
        
        with ftputil.FTPHost(ftp_host, ftp_user, ftp_pass) as ftp:
            remote_path = f"{transcoded_dir}/{base_name}_master.m3u8"
            ftp.upload(temp_file, remote_path)
        
        os.remove(temp_file)
        
        logging.info(f"Мастер-плейлист успешно создан и загружен: {remote_path}")
        return True
    except Exception as e:
        logging.error(f"Ошибка при создании мастер-плейлиста: {str(e)}")
        return False