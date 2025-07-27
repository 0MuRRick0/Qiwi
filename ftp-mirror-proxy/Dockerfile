FROM nginx:latest


RUN apt-get update && \
    apt-get install -y lftp cron fcgiwrap spawn-fcgi && \
    rm -rf /var/lib/apt/lists/*


COPY nginx.conf /etc/nginx/nginx.conf
COPY sync.sh /usr/local/bin/sync.sh
COPY periodic_sync.sh /usr/local/bin/periodic_sync.sh
COPY run.sh /usr/local/bin/run.sh
COPY fetch_and_serve.sh /usr/local/bin/fetch_and_serve.sh


RUN chmod +x /usr/local/bin/*.sh


RUN mkdir -p /usr/share/nginx/files


RUN touch /var/log/sync.log && chmod 666 /var/log/sync.log


CMD ["/usr/local/bin/run.sh"]