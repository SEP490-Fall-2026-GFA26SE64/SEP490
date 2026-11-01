#!/usr/bin/env bash
# Isolated acceptance launcher. Public fixture credentials; never targets development data.
set -euo pipefail
question_bank_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
question_bank_java="${JAVA_HOME:+${JAVA_HOME}/bin/}java"
question_bank_jar="$question_bank_root/backend/target/question-bank-test.jar"
if [[ ! -f "$question_bank_jar" ]]; then
  echo 'Package the backend and run backend/src/test/prepare-question-bank-runtime.py first.' >&2
  exit 1
fi
exec env ISOLATED_QUESTION_BANK_TEST=true \
  SPRING_PROFILES_ACTIVE=local,workspace-baseline SPRING_FLYWAY_ENABLED=true SERVER_PORT=28480 \
  'DB_URL=jdbc:postgresql://127.0.0.1:28432/question_bank_test?tcpKeepAlive=true&connectTimeout=5&socketTimeout=15' \
  DB_USER=question_bank_test DB_PASSWORD=question-bank-test-only \
  NEO4J_URI=bolt://127.0.0.1:28487 NEO4J_USER=neo4j NEO4J_PASSWORD=question-bank-test-only \
  CATALOG_SEED_ENABLED=false CATALOG_LOCAL_ACTOR_ENABLED=false WORKSPACE_DEV_SEED_ENABLED=false \
  SUBSCRIPTION_WORKER_ENABLED=false REGISTRATION_COOKIE_SECURE=false \
  SMTP_HOST=127.0.0.1 SMTP_PORT=28426 SMTP_FROM=question-bank@example.test \
  SMTP_AUTH=false SMTP_STARTTLS=false REGISTRATION_PUBLIC_BASE_URL=http://localhost:8098 \
  "$question_bank_java" -XX:ActiveProcessorCount=2 -Xms64m -Xmx384m \
  -Dspring.datasource.hikari.max-lifetime=60000 \
  -Dspring.datasource.hikari.keepalive-time=30000 \
  -Dspring.datasource.hikari.validation-timeout=3000 \
  -Dspring.neo4j.pool.idle-time-before-connection-test=1s \
  -Dspring.neo4j.pool.max-connection-lifetime=30s \
  -Dspring.neo4j.pool.connection-acquisition-timeout=5s \
  -Dspring.neo4j.connection-timeout=5s \
  -Dloader.main=com.adaptlearngraph.assessment.bank.QuestionBankTestRuntime \
  -cp "$question_bank_jar" org.springframework.boot.loader.launch.PropertiesLauncher
