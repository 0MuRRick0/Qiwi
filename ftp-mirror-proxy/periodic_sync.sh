#!/bin/sh

SYNC_INTERVAL=${SYNC_INTERVAL:-300}

if ! echo "$SYNC_INTERVAL" | grep -E '^[0-9]+$' > /dev/null || [ "$SYNC_INTERVAL" -le 0 ]; then
    echo "Ошибка: SYNC_INTERVAL должна быть положительным целым числом. Используется значение по умолчанию 300." >&2
    SYNC_INTERVAL=300
fi

echo "Запуск периодической синхронизации с интервалом ${SYNC_INTERVAL} секунд" >&2

while true; do
    /usr/local/bin/sync.sh
    if [ $? -ne 0 ]; then
        echo "Предупреждение: sync.sh завершился с ошибкой" >&2
    fi
    sleep "$SYNC_INTERVAL"
done