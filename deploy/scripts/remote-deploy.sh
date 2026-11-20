#!/usr/bin/env bash
# Server-side rollout for compose.deploy.yml. Invoked by .github/workflows/deploy.yml from $APP_DIR:
#   DOCKERHUB_USERNAME=... IMAGE_TAG=... DOMAIN=... bash deploy/scripts/remote-deploy.sh
# Never prints secret values.
set -euo pipefail

: "${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
DOMAIN="${DOMAIN:-adaptlearn.id.vn}"
NGINX_SITE="deploy/nginx/${DOMAIN}.conf"
CURL_IMAGE="curlimages/curl:8.11.1"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo -n"; fi
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); fi

# Reads one value from .env the way Compose does for simple KEY=value lines (no shell sourcing,
# so passwords with spaces/specials such as Gmail app passwords are safe).
env_get() {
  local line
  line="$(grep -E "^[[:space:]]*$1=" .env | tail -n1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  if [[ "$line" == \"*\" ]]; then line="${line:1:${#line}-2}"; fi
  if [[ "$line" == \'*\' ]]; then line="${line:1:${#line}-2}"; fi
  printf '%s' "$line"
}

curl_q() { "${DOCKER[@]}" run --rm -i --network host "$CURL_IMAGE" "$@"; }

# ---------------------------------------------------------------- configuration
log "Validating $(pwd)/.env"
[ -f .env ] || fail "Missing $(pwd)/.env. Create it from deploy/.env.example and fill in real values."
required=(PUBLIC_URL DB_PASSWORD NEO4J_PASSWORD LEARNING_ASSETS_ACCESS_KEY LEARNING_ASSETS_SECRET_KEY
  REGISTRATION_ENCRYPTION_KEY REGISTRATION_HMAC_KEY WORKSPACE_DEVELOPMENT_PASSWORD
  PLATFORM_ADMIN_SEED_EMAIL PLATFORM_ADMIN_SEED_PASSWORD SMTP_HOST SMTP_USERNAME SMTP_PASSWORD SMTP_FROM PAYOS_CLIENT_ID PAYOS_API_KEY PAYOS_CHECKSUM_KEY)
# Older server .env files do not contain inference settings. Export resolved values
# so capacity validation and every Compose invocation use the same configuration.
export RIASEC_MODEL="$(env_get RIASEC_MODEL)"
export RIASEC_OLLAMA_MEMORY="$(env_get RIASEC_OLLAMA_MEMORY)"
export RIASEC_OLLAMA_CPUS="$(env_get RIASEC_OLLAMA_CPUS)"
RIASEC_MODEL="${RIASEC_MODEL:-qwen3:4b-instruct-2507-q4_K_M}"
RIASEC_OLLAMA_MEMORY="${RIASEC_OLLAMA_MEMORY:-5g}"
RIASEC_OLLAMA_CPUS="${RIASEC_OLLAMA_CPUS:-2}"
export PLATFORM_ADMIN_SEED_EMAIL="${PLATFORM_ADMIN_SEED_EMAIL:-$(env_get PLATFORM_ADMIN_SEED_EMAIL)}"
export PLATFORM_ADMIN_SEED_EMAIL="${PLATFORM_ADMIN_SEED_EMAIL:-platform.admin@adaptlearngraph.com}"
export PLATFORM_ADMIN_SEED_PASSWORD="${PLATFORM_ADMIN_SEED_PASSWORD:-$(env_get PLATFORM_ADMIN_SEED_PASSWORD)}"
export PLATFORM_ADMIN_SEED_PASSWORD="${PLATFORM_ADMIN_SEED_PASSWORD:-Platform-Admin-490!}"
missing=()
for key in "${required[@]}"; do
  val="$(env_get "$key")"
  if [ -z "$val" ]; then
    if [ "$key" = "PLATFORM_ADMIN_SEED_EMAIL" ] || [ "$key" = "PLATFORM_ADMIN_SEED_PASSWORD" ]; then
      continue
    fi
    missing+=("$key")
  fi
done
[ ${#missing[@]} -eq 0 ] || fail "Empty/missing keys in .env: ${missing[*]}"
# Both workspace-seed and se-seed reject shorter passwords. Check before touching the stack.
workspace_password="$(env_get WORKSPACE_DEVELOPMENT_PASSWORD)"
[ "${#workspace_password}" -ge 12 ] || fail "WORKSPACE_DEVELOPMENT_PASSWORD must contain at least 12 characters (workspace-seed/se-seed requirement)."
unset workspace_password

# Measure the actual deployment host before starting inference or changing the stack.
riasec_memory="$RIASEC_OLLAMA_MEMORY"
riasec_cpus="$RIASEC_OLLAMA_CPUS"
[[ "$riasec_memory" =~ ^[1-9][0-9]*[mMgG]$ ]] || fail "RIASEC_OLLAMA_MEMORY must be whole MiB/GiB, for example 5120m or 5g."
[[ "$riasec_cpus" =~ ^[0-9]+([.][0-9]+)?$ ]] || fail "RIASEC_OLLAMA_CPUS must be a positive CPU count."
host_cpus="$(getconf _NPROCESSORS_ONLN)"
host_total_mb="$(awk '/^MemTotal:/ {print int($2/1024)}' /proc/meminfo)"
host_available_mb="$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo)"
riasec_memory_mb="${riasec_memory%?}"
[[ "$riasec_memory" =~ [gG]$ ]] && riasec_memory_mb=$((riasec_memory_mb * 1024))
log "RIASEC host capacity: ${host_available_mb} MiB available / ${host_total_mb} MiB total; ${host_cpus} logical CPUs. Requested inference: ${riasec_memory_mb} MiB / ${riasec_cpus} CPUs."
awk -v requested="$riasec_cpus" -v available="$host_cpus" 'BEGIN {exit !(requested>0 && requested<=available)}' || fail "RIASEC CPU limit exceeds host capacity."
[ "$riasec_memory_mb" -lt "$host_total_mb" ] || fail "RIASEC memory would consume the host; budget for the other services."
existing_inference="$("${DOCKER[@]}" ps -q --filter label=com.docker.compose.project=adapt-learn-graph --filter label=com.docker.compose.service=riasec-ollama)"
if [ -z "$existing_inference" ] && [ "$riasec_memory_mb" -gt "$host_available_mb" ]; then
  fail "Insufficient currently available RAM for the selected RIASEC model budget. Review server capacity before rollout."
fi

PUBLIC_URL="$(env_get PUBLIC_URL)"; PUBLIC_URL="${PUBLIC_URL%/}"
[[ "$PUBLIC_URL" == https://* ]] || fail "PUBLIC_URL must be https:// (PayOS callbacks and secure cookies require it)."
WEB_PORT="$(env_get WEB_PORT)"; WEB_PORT="${WEB_PORT:-8088}"
for key in REGISTRATION_ENCRYPTION_KEY REGISTRATION_HMAC_KEY; do
  bytes="$(printf '%s' "$(env_get "$key")" | base64 -d 2>/dev/null | wc -c || true)"
  [ "$bytes" -eq 32 ] || fail "$key must be Base64 of exactly 32 random bytes (openssl rand -base64 32)."
done
[ "$(env_get REGISTRATION_ENCRYPTION_KEY)" != "$(env_get REGISTRATION_HMAC_KEY)" ] \
  || fail "REGISTRATION_ENCRYPTION_KEY and REGISTRATION_HMAC_KEY must differ."

if ! $SUDO test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" || ! $SUDO test -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"; then
  fail "Missing TLS certificates for ${DOMAIN}. Run Certbot on the server before deploying (see deploy/README.md)."
fi

# ---------------------------------------------------------------- SMTP preflight
# Proves outbound reachability, STARTTLS and credentials before touching the running stack.
if [ "${SKIP_SMTP_CHECK:-false}" = "true" ] || [ "$(env_get SKIP_SMTP_CHECK)" = "true" ] || [ "$(env_get SMTP_CHECK)" = "false" ]; then
  log "Skipping SMTP preflight check"
else
  smtp_port="$(env_get SMTP_PORT)"; smtp_port="${smtp_port:-587}"
  log "Checking SMTP $(env_get SMTP_HOST):${smtp_port} (STARTTLS + AUTH)"
  smtp_args=(-sS --max-time 30 --url "smtp://$(env_get SMTP_HOST):${smtp_port}" -X NOOP -K -)
  [ "$(env_get SMTP_STARTTLS)" = "false" ] || smtp_args=(--ssl-reqd "${smtp_args[@]}")
  smtp_cfg=""
  if [ "$(env_get SMTP_AUTH)" != "false" ]; then
    u="$(env_get SMTP_USERNAME)"; p="$(env_get SMTP_PASSWORD)"
    u="${u//\\/\\\\}"; u="${u//\"/\\\"}"; p="${p//\\/\\\\}"; p="${p//\"/\\\"}"
    smtp_cfg="user = \"${u}:${p}\""
  fi
  "${DOCKER[@]}" pull -q "$CURL_IMAGE" >/dev/null
  if ! printf '%s\n' "$smtp_cfg" | curl_q "${smtp_args[@]}" >/dev/null; then
    log "WARNING: SMTP check failed (host/port blocked, STARTTLS refused or bad credentials). Gmail may need an App Password. Proceeding with deployment since mail service is non-blocking..."
  else
    echo "SMTP OK"
  fi
fi

# ---------------------------------------------------------------- rollout
COMPOSE=("${DOCKER[@]}" compose -f compose.deploy.yml --env-file .env --env-file .env.release)
[ -f .env.release ] && cp .env.release .env.release.previous
umask 077
printf 'DOCKERHUB_USERNAME=%s\nIMAGE_TAG=%s\n' "$DOCKERHUB_USERNAME" "$IMAGE_TAG" > .env.release

log "Pulling images (tag ${IMAGE_TAG})"
"${COMPOSE[@]}" pull --quiet

log "Preparing the configured RIASEC model in its persistent private-inference volume"
"${COMPOSE[@]}" --profile riasec-setup run --rm --no-deps riasec-model-pull

log "Starting stack (migrations and idempotent seed jobs run first; first boot can take several minutes)"
rollout_log="$(mktemp)"
trap 'rm -f "$rollout_log"' EXIT
if ! "${COMPOSE[@]}" up -d --remove-orphans 2>&1 | tee "$rollout_log"; then
  "${COMPOSE[@]}" ps -a || true
  for svc in migrate seed workspace-seed catalog-ready se-seed platform-seed api knowledge-seed module-knowledge-seed; do
    printf '\n----- %s (last 60 lines)\n' "$svc"; "${COMPOSE[@]}" logs --no-color --tail 60 "$svc" 2>/dev/null || true
  done
  # Keep the actual Compose error visible after the lengthy Spring seed logs.
  printf '\n===== Original Docker Compose failure (last 25 lines) =====\n'
  tail -n 25 "$rollout_log"
  printf '\n===== Container status after failed rollout =====\n'
  "${COMPOSE[@]}" ps -a || true
  fail "docker compose up failed."
fi
rm -f "$rollout_log"
trap - EXIT

log "Waiting for web container health"
web_id="$("${COMPOSE[@]}" ps -q web)"
for _ in $(seq 1 30); do
  status="$("${DOCKER[@]}" inspect -f '{{.State.Health.Status}}' "$web_id" 2>/dev/null || echo unknown)"
  [ "$status" = "healthy" ] && break
  sleep 5
done
[ "$status" = "healthy" ] || { "${COMPOSE[@]}" logs --no-color --tail 80 web api || true; fail "web did not become healthy."; }

log "Local smoke checks via 127.0.0.1:${WEB_PORT}"
curl_q -fsS -o /dev/null --max-time 15 "http://127.0.0.1:${WEB_PORT}/" || fail "SPA not served."
curl_q -fsS -o /dev/null --max-time 15 "http://127.0.0.1:${WEB_PORT}/api/v1/registration/csrf" \
  || fail "API not reachable through the web proxy."
echo "Local checks OK"

# The SMTP preflight runs on the host network; the API runs on the stack's bridge, which a host
# DOCKER-USER firewall can block independently (README: "Outbound firewall").
log "Checking outbound SMTP and PayOS from the app network"
# Web has only the default app network. API also joins the private inference network.
app_net="$("${DOCKER[@]}" inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$web_id")"
curl_app() { "${DOCKER[@]}" run --rm -i --network "$app_net" "$CURL_IMAGE" "$@"; }
if [ "${SKIP_SMTP_CHECK:-false}" != "true" ] && [ "$(env_get SKIP_SMTP_CHECK)" != "true" ] && [ "$(env_get SMTP_CHECK)" != "false" ]; then
  if ! printf '%s\n' "$smtp_cfg" | curl_app "${smtp_args[@]}" >/dev/null; then
    log "WARNING: SMTP check from app network ${app_net} did not succeed (check firewall or credentials). Proceeding..."
  else
    echo "SMTP Outbound OK"
  fi
fi
curl_app -sS -o /dev/null --max-time 20 https://api-merchant.payos.vn \
  || fail "PayOS API is not reachable from Docker network ${app_net}. Allow outbound traffic from bridge br-adaptlearn in the DOCKER-USER firewall chain."
echo "Outbound OK"

# ---------------------------------------------------------------- nginx
log "Installing Nginx site ${DOMAIN}"
$SUDO mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot
$SUDO cp "$NGINX_SITE" "/etc/nginx/sites-available/${DOMAIN}"
$SUDO ln -sfn "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
$SUDO nginx -t
$SUDO systemctl reload nginx

# Goes through the local Nginx with the real certificate; --resolve avoids depending on hairpin NAT.
# The external reachability check runs from the GitHub runner after this script.
log "HTTPS checks via local Nginx for ${PUBLIC_URL}"
public_host="${PUBLIC_URL#https://}"; public_host="${public_host%%/*}"
ok=0
for _ in $(seq 1 6); do
  if curl_q -fsS -o /dev/null --max-time 15 --resolve "${public_host}:443:127.0.0.1" \
      "${PUBLIC_URL}/api/v1/registration/csrf"; then ok=1; break; fi
  sleep 5
done
[ "$ok" = 1 ] || fail "Nginx TLS proxy for ${public_host} is not working (certificate or proxy config)."
echo "Nginx HTTPS OK"

# ---------------------------------------------------------------- PayOS
if [ "$(env_get PAYOS_CONFIRM_WEBHOOK)" != "false" ]; then
  webhook="${PUBLIC_URL}/api/v1/payments/payos/webhook"
  log "Registering PayOS webhook ${webhook}"
  # PayOS validates the credentials and POSTs a signed test payload that the API must accept.
  response="$(printf 'header = "x-client-id: %s"\nheader = "x-api-key: %s"\n' "$(env_get PAYOS_CLIENT_ID)" "$(env_get PAYOS_API_KEY)" \
    | curl_q -sS --max-time 60 -K - -H 'Content-Type: application/json' \
        -d "{\"webhookUrl\":\"${webhook}\"}" https://api-merchant.payos.vn/confirm-webhook || true)"
  if ! printf '%s' "$response" | grep -q '"code"[[:space:]]*:[[:space:]]*"00"'; then
    printf 'PayOS response: %s\n' "$(printf '%s' "$response" | sed -E 's/"(webhookUrl|accountNumber|accountName)":"[^"]*"/"\1":"***"/g' | head -c 400)" >&2
    "${COMPOSE[@]}" logs --no-color --tail 40 api 2>/dev/null | grep -i payos || true
    fail "PayOS confirm-webhook failed (check PAYOS_* keys, active payment channel, and that ${webhook} is reachable from the Internet)."
  fi
  echo "PayOS OK"
fi

log "Pruning dangling images"
"${DOCKER[@]}" image prune -f >/dev/null || true

"${COMPOSE[@]}" ps
log "Deployed ${IMAGE_TAG} to ${PUBLIC_URL}"
