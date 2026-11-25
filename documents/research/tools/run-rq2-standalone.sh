#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
case "${1:-}" in
  1k) nodes=1000; port=17681 ;;
  5k) nodes=5000; port=17685 ;;
  10k) nodes=10000; port=17690 ;;
  *) echo 'Usage: bash documents/research/tools/run-rq2-standalone.sh <1k|5k|10k> [result.json]' >&2; exit 2 ;;
esac
scale=$1
: "${RQ2_NEO4J_PASSWORD:?Export RQ2_NEO4J_PASSWORD from your local environment}"
output=${2:-documents/research/results/rq2-standalone-$(date +%Y%m%d-%H%M%S)-$scale.json}
compose=(docker compose -f compose.rq2-standalone.yml)
cp_file=$(mktemp)
trap 'rm -f "$cp_file"' EXIT
mvn -q -f backend/pom.xml -DskipTests compile dependency:build-classpath "-Dmdep.outputFile=$cp_file"
"${compose[@]}" up -d "rq2-$scale"
trap '"${compose[@]}" stop "rq2-$scale"; rm -f "$cp_file"' EXIT
neo() {
  "${compose[@]}" exec -T "rq2-$scale" sh -ec '
    cypher-shell -a bolt://127.0.0.1:7687 -u neo4j -p "${NEO4J_AUTH#neo4j/}" "$@"
  ' seed "$@"
}
for attempt in $(seq 1 30); do
  if neo 'RETURN 1' >/dev/null 2>&1; then break; fi
  if [ "$attempt" = 30 ]; then echo 'Neo4j did not become ready' >&2; exit 1; fi
  sleep 2
done
neo --param "nodes => $nodes" --format plain < documents/research/tools/rq2-seed.cypher
mkdir -p "$(dirname "$output")"
env "RQ2_NEO4J_URI_$(printf %s "$scale" | tr '[:lower:]' '[:upper:]')=bolt://127.0.0.1:$port" \
  java -Xmx256m -cp "backend/target/classes:$(cat "$cp_file")" documents/research/tools/Rq2Standalone.java "$scale" "$output"
