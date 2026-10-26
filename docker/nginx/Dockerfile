FROM nginx:1.27.5-alpine

RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs /etc/nginx/snippets

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY snippets/ /etc/nginx/snippets/
# Roda antes do nginx subir (mecanismo /docker-entrypoint.d da imagem oficial).
COPY 40-gateway-setup.sh /docker-entrypoint.d/40-gateway-setup.sh
RUN chmod +x /docker-entrypoint.d/40-gateway-setup.sh

EXPOSE 80 443
