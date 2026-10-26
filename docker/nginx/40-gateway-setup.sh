#!/bin/sh
# Prepara o gateway antes do nginx iniciar:
#  1. gera um certificado autoassinado se não houver um em /etc/nginx/certs
#     (para usar um certificado próprio, coloque server.crt e server.key no volume nginx-certs);
#  2. liga/desliga o redirecionamento HTTP -> HTTPS (NGINX_FORCE_HTTPS).
set -eu

CERT_DIR=/etc/nginx/certs
CRT="$CERT_DIR/server.crt"
KEY="$CERT_DIR/server.key"

if [ ! -s "$CRT" ] || [ ! -s "$KEY" ]; then
  echo "gateway: gerando certificado autoassinado (${NGINX_SELF_SIGNED_CERT_SUBJECT:-/CN=localhost})"
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -subj "${NGINX_SELF_SIGNED_CERT_SUBJECT:-/CN=localhost}" \
    -addext "subjectAltName=${NGINX_SELF_SIGNED_CERT_SAN:-DNS:localhost}" \
    -keyout "$KEY" -out "$CRT" 2>/dev/null
  chmod 600 "$KEY"
fi

REDIRECT=/etc/nginx/snippets/redirect.conf
if [ "${NGINX_FORCE_HTTPS:-false}" = "true" ]; then
  # Atrás do Traefik a requisição já chega como https (X-Forwarded-Proto), então não há loop.
  echo 'if ($forwarded_proto != "https") { return 301 https://$host$request_uri; }' > "$REDIRECT"
else
  : > "$REDIRECT"
fi
