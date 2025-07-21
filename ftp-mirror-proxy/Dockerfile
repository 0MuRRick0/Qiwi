FROM nginx:latest


RUN apt update && \
    apt install -y lftp cron fcgiwrap spawn-fcgi && \
    rm -rf /var/lib/apt/lists/*


COPY nginx.conf /etc/nginx/nginx.conf
COPY sync.sh /usr/local/bin/sync.sh
COPY run.sh /usr/local/bin/run.sh
COPY fetch_and_serve.sh /usr/local/bin/fetch_and_serve.sh


RUN chmod +x /usr/local/bin/sync.sh
RUN chmod +x /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/fetch_and_serve.sh


RUN mkdir -p /usr/share/nginx/files


CMD ["run.sh"]