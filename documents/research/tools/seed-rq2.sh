#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
compose=(docker compose -f compose.dev.yml -f compose.rq2-dev.yml)
seed() {
  "${compose[@]}" exec -T "$1" sh -eu -c '
    password=${NEO4J_AUTH#neo4j/}
    cypher-shell -a bolt://127.0.0.1:7687 -u neo4j -p "$password" --param "nodes => $1" --format plain < /rq2-seed.cypher
  ' seed "$2"
}
seed rq2-1k 1000
seed rq2-5k 5000
seed rq2-10k 10000
