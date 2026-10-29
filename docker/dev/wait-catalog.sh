#!/bin/bash
set -euo pipefail
for ((attempt=0; attempt<120; attempt++)); do
  if [ -f /catalog-state/sealed-v011 ]; then
    setting=$(cypher-shell -a bolt://neo4j:7687 -u neo4j -p "$NEO4J_PASSWORD" --format plain \
      "SHOW SETTINGS YIELD name,value WHERE name='server.databases.default_to_read_only' RETURN value" 2>/dev/null || true)
    access=$(cypher-shell -a bolt://neo4j:7687 -u neo4j -p "$NEO4J_PASSWORD" --format plain \
      'SHOW DATABASE neo4j YIELD access,currentStatus RETURN access,currentStatus' 2>/dev/null || true)
    if [[ "$setting" == *'"true"'* && "$access" == *'"read-only", "online"'* ]]; then
      echo 'Catalog is online and sealed read-only.'
      exit 0
    fi
  fi
  sleep 2
done
echo 'Catalog did not finish the import/index/graceful-seal lifecycle.' >&2
exit 1
