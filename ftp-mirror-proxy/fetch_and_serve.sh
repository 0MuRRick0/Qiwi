#!/bin/sh
echo "🎬 fetch_and_serve.sh запущен" >&2
REQUEST_URI=$(echo "$REQUEST_URI" | sed -E 's/\/fetch_and_serve//; s/\/$//')
FILE_PATH="/usr/share/nginx/files/media$REQUEST_URI"
if [ -f "$FILE_PATH" ]; then
    echo "File exists. Serving..."
    exit 0
else
    echo "File not found locally. Syncing..."
    /usr/local/bin/sync.sh
    if [ -f "$FILE_PATH" ]; then
        echo "File found after sync. Serving..."
        exit 0
    else
        echo "Status: 404 Not Found"
        echo ""
        echo "File not found"
        exit 1
    fi
fi