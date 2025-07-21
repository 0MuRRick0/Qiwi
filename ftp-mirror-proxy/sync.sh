#!/bin/sh

set -e

FTP_HOST=${FTP_HOST:?FTP_HOST not set}
FTP_USER_NAME=${FTP_USER_NAME:?FTP_USER_NAME not set}
FTP_USER_PASS=${FTP_USER_PASS:?FTP_USER_PASS not set}
FTP_PATH=${FTP_USER_NAME_HOME:-/}
LOCAL_PATH=${LOCAL_PATH:-/usr/share/nginx/files}

echo "🔄 Синхронизация с ftp://$FTP_HOST$FTP_PATH в $LOCAL_PATH" >&2

lftp -u "$FTP_USER_NAME","$FTP_USER_PASS" "$FTP_HOST" <<EOF
mirror --verbose --delete --only-newer "$FTP_PATH" "$LOCAL_PATH"
quit
EOF

echo "✅ Синхронизация завершена"