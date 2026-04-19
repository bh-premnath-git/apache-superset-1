FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY docker/keycloak-nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/keycloak-nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
