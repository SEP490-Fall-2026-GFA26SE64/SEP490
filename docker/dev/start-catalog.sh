#!/bin/bash
set -euo pipefail
# Dev lifecycle only. A shared marker coordinates seed; graph data is never reset.
mkdir -p /catalog-state
chmod 1777 /catalog-state
if [ -f /catalog-state/sealed-v011 ]; then
  export NEO4J_server_databases_default__to__read__only=false
  exec /startup/docker-entrypoint.sh neo4j
fi
export NEO4J_server_databases_default__to__read__only=false
/startup/docker-entrypoint.sh neo4j &
catalog_pid=$!
shutdown() { kill -TERM "$catalog_pid" 2>/dev/null || true; wait "$catalog_pid" || true; }
trap 'shutdown; exit 143' TERM INT
while [ ! -f /catalog-state/imported-v011 ]; do
  kill -0 "$catalog_pid" 2>/dev/null || { wait "$catalog_pid"; exit 1; }
  sleep 2
done
cypher-shell -a bolt://localhost:7687 -u neo4j -p "${NEO4J_AUTH#*/}" 'CALL db.awaitIndexes(180)'
shutdown
touch /catalog-state/sealed-v011
export NEO4J_server_databases_default__to__read__only=false
exec /startup/docker-entrypoint.sh neo4j
