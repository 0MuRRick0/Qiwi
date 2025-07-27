#!/bin/sh


/usr/local/bin/periodic_sync.sh &

spawn-fcgi -s /var/run/fcgiwrap.socket -F 1 -U www-data -G www-data /usr/sbin/fcgiwrap
chmod 777 /var/run/fcgiwrap.socket

nginx -g "daemon off;"