#!/usr/bin/env sh
set -eu

mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/tls.crt ] || [ ! -f /etc/nginx/ssl/tls.key ]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
    -keyout /etc/nginx/ssl/tls.key \
    -out /etc/nginx/ssl/tls.crt \
    -days 3650 \
    -subj "/CN=localhost"
fi

exec "$@"
