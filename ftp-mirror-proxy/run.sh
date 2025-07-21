#!/bin/sh


sync.sh


echo "*/5 * * * * root /usr/local/bin/sync.sh" > /etc/cron.d/sync
chmod 0644 /etc/cron.d/sync
crontab /etc/cron.d/sync
service cron start


spawn-fcgi -s /var/run/fcgiwrap.socket -F 1 -U www-data -G www-data /usr/sbin/fcgiwrap
chmod 777 /var/run/fcgiwrap.socket


nginx -g "daemon off;"