#!/bin/sh
set -eu
# Private container-volume keys, generated once. Never print or commit the values.
if [ ! -s /config/security.properties ]; then
  umask 077
  {
    printf 'registration.encryption-key='
    head -c 32 /dev/urandom | base64
    printf 'registration.hmac-key='
    head -c 32 /dev/urandom | base64
  } > /config/security.properties.pending
  # The API runs as an unprivileged user and receives this volume read-only.
  chmod 0444 /config/security.properties.pending
  mv /config/security.properties.pending /config/security.properties
fi
