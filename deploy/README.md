# On-premises deployment

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) deploys every push to `main` (or a manual run) to one Linux server at `https://adaptlearn.id.vn`:

1. **Build** on a GitHub-hosted runner and push to Docker Hub: `adapt-learn-graph-backend` and `adapt-learn-graph-frontend` (`:latest` and `:<commit-sha>`), plus `adapt-learn-graph-minio:<release>` built once from MinIO's official tagged source ([minio/Dockerfile](minio/Dockerfile)). Upstream no longer publishes MinIO images or binaries.
2. **Ship** a bundle over SSH to `$APP_DIR`: [compose.deploy.yml](../compose.deploy.yml), the Neo4j catalog scripts, the seed datasets, the Nginx site and [scripts/remote-deploy.sh](scripts/remote-deploy.sh). The server's `.env` and Docker volumes are never overwritten.
3. **Roll out** with `remote-deploy.sh`:
   - validate `.env` and the TLS certificate;
   - check SMTP (STARTTLS + login) before changing anything;
   - `docker compose pull` and `up -d`: migrations → idempotent seed jobs → API → web;
   - local smoke checks;
   - install and reload the Nginx site, then check HTTPS through it;
   - register and confirm the PayOS webhook.
4. **Check externally** from the runner that `https://adaptlearn.id.vn` responds.

The stack runs the full product composition (Spring profiles `local,workspace-baseline,workspace-development`, the same as `compose.dev.yml`), with live SMTP and PayOS. The `prod` profile in `compose.prod.yml` disables most learning features. Only the web container is published, on `127.0.0.1:8088`; PostgreSQL, Neo4j, MinIO and the API stay on the internal Docker network.

> [!WARNING]
> This composition carries the same security posture as the shared dev environment. `local`-profile catalog endpoints (for example `/api/v1/organizations/**`) are open without authentication, and the seeded demo workspace accounts exist, protected by `WORKSPACE_DEVELOPMENT_PASSWORD`. Treat the deployment as a staging/demo environment until those profiles are hardened.

## One-time server setup

Requirements: Ubuntu/Debian with ≥ 4 vCPU, ≥ 8 GB RAM and ≥ 30 GB of disk; DNS `A` records for `adaptlearn.id.vn` and `www.adaptlearn.id.vn` pointing at the server's public IP; inbound TCP 80/443 open (port-forwarded if the server is behind NAT); outbound 443 (Docker Hub, PayOS) and 587 (SMTP) open.

```bash
# Docker Engine + Compose v2.24+ , Nginx, Certbot
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y nginx certbot

# Deploy user: SSH key login, Docker access, passwordless sudo for nginx/systemctl/cp/ln/mkdir/test
sudo adduser --disabled-password deploy
sudo usermod -aG docker deploy
echo 'deploy ALL=(root) NOPASSWD: /usr/sbin/nginx, /usr/bin/systemctl reload nginx, /usr/bin/cp, /usr/bin/ln, /usr/bin/mkdir, /usr/bin/test' | sudo tee /etc/sudoers.d/deploy
sudo install -d -o deploy -g deploy /opt/adapt-learn-graph

# TLS certificate. The hooks free port 80 while Certbot validates and are reused by the automatic renewal timer.
sudo mkdir -p /var/www/certbot
sudo certbot certonly --standalone -d adaptlearn.id.vn -d www.adaptlearn.id.vn \
  --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"
sudo certbot renew --dry-run
```

Create `/opt/adapt-learn-graph/.env` from [.env.example](.env.example), fill in every value, then run `chmod 600 .env`. Generate secrets with `openssl rand -base64 32` (registration keys must be exactly that). Back up `.env` **together with** the database volumes: replacing `REGISTRATION_*` keys breaks stored MFA secrets, and changing `DB_PASSWORD`/`NEO4J_PASSWORD` after the first start does not re-key existing volumes.

If the Docker Hub repositories are private, run `docker login` once as the deploy user on the server.

### Outbound firewall

The stack runs on the Docker bridge `br-adaptlearn`, which has a fixed name set in [compose.deploy.yml](../compose.deploy.yml). If the host restricts container traffic with a whitelist in the `DOCKER-USER` chain that ends in `-j DROP`, allow this bridge out to the Internet while blocking private ranges. Without that rule, SMTP mail and PayOS calls time out from the API even though they work from the host. Replace `eno3` with the server's uplink interface (`ip route show default`):

```bash
sudo iptables -I DOCKER-USER 1 -i br-adaptlearn -o eno3 -j ACCEPT
for net in 192.168.0.0/16 172.16.0.0/12 10.0.0.0/8; do sudo iptables -I DOCKER-USER 1 -i br-adaptlearn -d "$net" -j DROP; done
# Persist the same lines in /etc/iptables/rules.v4 (netfilter-persistent) or your firewall manager.
```

The rollout verifies SMTP and PayOS from the app network and fails with a firewall hint if they are blocked.

## GitHub configuration

Repository **Settings → Secrets and variables → Actions** (the deploy job uses the `production` environment, which can also hold these secrets and add required reviewers):

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub account or organization |
| `DOCKERHUB_PASSWORD` | Docker Hub access token (Read & Write) |
| `SSH_PRIVATE_KEY` | Private key whose public key is in the deploy user's `authorized_keys` |
| `VPS_HOST` | Server public IP or DNS name |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | Optional, default `22` |
| `VPS_APP_DIR` | Optional, default `/opt/adapt-learn-graph` |

Application secrets (database, SMTP, PayOS, registration keys) live only in the server's `.env`, never in GitHub.

## Third-party integrations

**SMTP.** The app supports STARTTLS on port 587 only. For Gmail, use `smtp.gmail.com`, the full address, and an [App Password](https://myaccount.google.com/apppasswords) (2-Step Verification required). `SMTP_FROM` must be an address the account may send as. Every deploy fails early if the server can't open STARTTLS or log in. The API's mail health indicator is off, so a later mail outage doesn't take the site down; failed mail is retried by the registration mail worker.

**PayOS.** Copy the Client ID, API Key and Checksum Key from **my.payos.vn → payment channel**. `PUBLIC_URL` must be HTTPS; it is used for checkout return/cancel URLs and the webhook. Each deploy calls PayOS `confirm-webhook` with `${PUBLIC_URL}/api/v1/payments/payos/webhook`. PayOS then sends a signed test payload to the live site, so the check proves that the keys are valid, that the site is reachable from the Internet, and that signature verification uses the right checksum key. Set `PAYOS_CONFIRM_WEBHOOK=false` to skip it (for example, while DNS isn't public yet).

## Operations

Run commands from `/opt/adapt-learn-graph`. `.env.release` records the deployed image tag.

```bash
alias dc='docker compose -f compose.deploy.yml --env-file .env --env-file .env.release'
dc ps -a                                   # all seed jobs should be "Exited (0)"
dc logs -f --tail 200 api
dc --profile tools run --rm platform-seed  # one-off: create the platform admin from PLATFORM_ADMIN_SEED_*
```

**Rollback.** Re-run the workflow for an earlier commit, or on the server:

```bash
cp .env.release.previous .env.release && dc up -d
```

Database migrations are forward-only, so roll back only to builds that share the current schema.

**Backups.** Back up the `adapt-learn-graph_postgres_data`, `_neo4j_data`, `_learning_assets` and `_catalog_state` volumes together with `.env`. Never run `dc down -v`.

The first deploy takes roughly 5–10 minutes because migrations and seed jobs run on empty volumes. Later deploys re-run the idempotent seed jobs, then restart the API and web containers.
