#!/usr/bin/env bash
# Gerencia o Contador de Horas (MongoDB + API + Web + gateway nginx) via Docker Compose.
# Uso: ./contador.sh {start|stop|restart|status|logs|update|backup|restore} [args]
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

BACKUP_DIR="backups"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
fail()  { printf '\033[1;31m✘\033[0m %s\n' "$*" >&2; exit 1; }

# Arquivos do compose: com TRAEFIK_ENABLED=true entra o override do Traefik.
compose_files() {
  local files=(-f docker-compose.yml)
  if [[ "${TRAEFIK_ENABLED:-false}" == "true" ]]; then
    files+=(-f docker-compose.traefik.yml)
  fi
  printf '%s
' "${files[@]}"
}

# docker compose (plugin v2) ou docker-compose (v1)
compose() {
  local files
  mapfile -t files < <(compose_files)
  if docker compose version >/dev/null 2>&1; then
    docker compose "${files[@]}" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "${files[@]}" "$@"
  else
    fail "Docker Compose não encontrado. Instale o plugin: https://docs.docker.com/compose/install/linux/"
  fi
}

check_requirements() {
  command -v docker >/dev/null 2>&1 || fail "Docker não encontrado. Instale: https://docs.docker.com/engine/install/"
  docker info >/dev/null 2>&1 || fail "Sem acesso ao Docker. Inicie o serviço (sudo systemctl start docker) ou adicione seu usuário ao grupo docker."
  compose version >/dev/null
  if [[ "${TRAEFIK_ENABLED:-false}" == "true" ]]; then
    [[ -n "${APP_DOMAIN:-}" ]] || fail "TRAEFIK_ENABLED=true exige APP_DOMAIN no .env"
    docker network inspect "${TRAEFIK_NETWORK:-proxy}" >/dev/null 2>&1       || fail "Rede do Traefik '${TRAEFIK_NETWORK:-proxy}' não existe. Veja as redes com: docker network ls"
  fi
}

random_secret() {
  # $1 = quantidade de bytes aleatórios
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

ensure_env() {
  if [[ -f .env ]]; then
    return
  fi
  info "Criando .env com senhas aleatórias"
  umask 077
  cat > .env <<EOF
MONGO_USER=contador
MONGO_PASSWORD=$(random_secret 18)
JWT_SECRET=$(random_secret 48)

HTTP_PORT=80
HTTPS_PORT=443
NGINX_SELF_SIGNED_CERT_SUBJECT=/CN=localhost
NGINX_SELF_SIGNED_CERT_SAN=DNS:localhost
NGINX_FORCE_HTTPS=false
BACKEND_REPLICAS=1

# Traefik (veja o README): true = o Traefik do servidor encaminha APP_DOMAIN para o gateway
TRAEFIK_ENABLED=false
APP_DOMAIN=
TRAEFIK_NETWORK=proxy
TRAEFIK_CERTRESOLVER=letsencrypt
TRAEFIK_ENTRYPOINT_HTTPS=websecure
TRAEFIK_ENTRYPOINT_HTTP=web
EOF
  ok ".env criado (guarde este arquivo: sem ele não é possível acessar o banco existente)"
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

public_url() {
  if [[ "${TRAEFIK_ENABLED:-false}" == "true" ]]; then
    echo "https://${APP_DOMAIN}"
    return
  fi
  local ip port="${HTTP_PORT:-80}"
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  [[ "$port" == "80" ]] && echo "http://${ip:-localhost}" || echo "http://${ip:-localhost}:${port}"
}

wait_until_ready() {
  local out=""
  info "Aguardando a API responder pelo gateway"
  for _ in $(seq 1 60); do
    # Testa de dentro do container do nginx (funciona com ou sem portas publicadas).
    # 401 = API no ar exigindo login.
    out=$(compose exec -T nginx sh -c       'wget -S -O /dev/null "http://127.0.0.1/api/summary?month=2000-01" 2>&1' || true)
    if grep -q ' 401' <<<"$out"; then
      ok "Contador de Horas no ar: $(public_url)"
      return
    fi
    sleep 2
  done
  fail "A API não respondeu pelo gateway. Veja os logs: ./contador.sh logs nginx (ou backend)"
}

cmd_start() {
  check_requirements
  ensure_env
  load_env
  info "Construindo e subindo os serviços (backend x${BACKEND_REPLICAS:-1})"
  compose up -d --build --remove-orphans --scale "backend=${BACKEND_REPLICAS:-1}"
  wait_until_ready
}

cmd_stop() {
  check_requirements
  compose down
  ok "Serviços parados (os dados continuam no volume do MongoDB)"
}

cmd_status() {
  check_requirements
  compose ps
}

cmd_logs() {
  check_requirements
  compose logs -f --tail=200 "$@"
}

cmd_update() {
  check_requirements
  if [[ -d .git ]]; then
    info "Atualizando o código (git pull)"
    git pull --ff-only
  fi
  cmd_start
}

cmd_backup() {
  check_requirements
  load_env
  mkdir -p "$BACKUP_DIR"
  local file
  file="${BACKUP_DIR}/contadorhoras-$(date +%Y%m%d-%H%M%S).archive.gz"
  info "Gerando backup em ${file}"
  compose exec -T mongo mongodump --quiet \
    -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
    --db contadorhoras --archive --gzip > "$file"
  ok "Backup concluído ($(du -h "$file" | cut -f1))"
}

cmd_restore() {
  local file="${1:-}"
  [[ -n "$file" && -f "$file" ]] || fail "Informe o arquivo: ./contador.sh restore backups/contadorhoras-AAAAMMDD-HHMMSS.archive.gz"
  check_requirements
  load_env
  read -r -p "Isto SUBSTITUI todos os dados atuais pelo backup ${file}. Continuar? [s/N] " answer
  [[ "$answer" =~ ^[sS]$ ]] || fail "Restauração cancelada"
  compose exec -T mongo mongorestore --quiet --drop \
    -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
    --nsInclude 'contadorhoras.*' --archive --gzip < "$file"
  ok "Backup restaurado"
}

usage() {
  cat <<EOF
Uso: ./contador.sh <comando>

  start            Cria o .env (se não existir), constrói e sobe tudo
  stop             Para os serviços (mantém os dados)
  restart          stop + start
  status           Mostra o estado dos containers
  logs [serviço]   Acompanha os logs (nginx | backend | frontend | mongo)
  update           git pull + reconstrói e sobe
  backup           Salva o banco em ${BACKUP_DIR}/
  restore <arq>    Restaura um backup (substitui os dados atuais)
EOF
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status)  cmd_status ;;
  logs)    shift; cmd_logs "$@" ;;
  update)  cmd_update ;;
  backup)  cmd_backup ;;
  restore) shift; cmd_restore "$@" ;;
  *)       usage; [[ -z "${1:-}" ]] || exit 1 ;;
esac
