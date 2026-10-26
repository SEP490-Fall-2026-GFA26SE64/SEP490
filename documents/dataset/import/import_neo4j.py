"""Import catalog 0.9.0 into an empty or identical isolated Neo4j graph."""
import argparse,getpass,json,os
from pathlib import Path
from collections import defaultdict
from validate_dataset import validate,require,LABELS,TYPES
parser=argparse.ArgumentParser()
parser.add_argument('--file',type=Path,default=Path(__file__).resolve().parent/'ontology_seed.json')
parser.add_argument('--dry-run',action='store_true')
args=parser.parse_args()
data,report=validate(args.file)
from graph_payload import build_payload
nodes,edges,batches=build_payload(data)
print(f"Local checks passed: {report['totalNodes']} nodes, {report['totalRelationships']} relationships, 30 source RIASEC ratings.")
if args.dry_run:raise SystemExit(0)

from neo4j import GraphDatabase
uri = os.environ.get("ONTOLOGY_NEO4J_URI", "bolt://localhost:7692")
user = os.environ.get("ONTOLOGY_NEO4J_USER", "neo4j")
password = os.environ.get("ONTOLOGY_NEO4J_PASSWORD") or getpass.getpass("Neo4j password: ")
database = os.environ.get("ONTOLOGY_NEO4J_DATABASE", "neo4j")

def snapshot(tx):
    actual_nodes, actual_edges = {}, {}
    for r in tx.run("MATCH (n) RETURN labels(n) AS labels, properties(n) AS props"):
        require(r["props"].get("id") not in actual_nodes, "Existing duplicate/missing node ID")
        actual_nodes[r["props"].get("id")] = (sorted(r["labels"]), dict(r["props"]))
    for r in tx.run("MATCH (a)-[r]->(b) RETURN type(r) AS kind, a.id AS src, b.id AS dst, properties(r) AS props"):
        require(r["props"].get("id") not in actual_edges, "Existing duplicate/missing edge ID")
        actual_edges[r["props"].get("id")] = (r["kind"], r["src"], r["dst"], dict(r["props"]))
    return actual_nodes, actual_edges

def preflight(tx):
    old_nodes, old_edges = snapshot(tx)
    require((not old_nodes and not old_edges) or (old_nodes == nodes and old_edges == edges),
            "Database is neither empty nor an exact copy of this release; import refused")

def import_graph(tx):
    preflight(tx)
    if tx.run("MATCH (n) RETURN count(n) AS total").single()["total"]:
        return "Exact release already present; no changes made."
    for label, rows in batches.items():
        # Labels/types come exclusively from the fixed allowlists above.
        tx.run(f"UNWIND $rows AS row CREATE (n:{label}) SET n = row", rows=rows).consume()
    for kind, endpoint_pairs in TYPES.items():
        for start, end in sorted(endpoint_pairs):
            rows = [{"fromId": a, "toId": b, "props": p} for t, a, b, p in edges.values() if t == kind and nodes[a][0] == [start] and nodes[b][0] == [end]]
            query = (f"UNWIND $rows AS row MATCH (a:{start} {{id: row.fromId}}) "
                     f"MATCH (b:{end} {{id: row.toId}}) CREATE (a)-[r:{kind}]->(b) SET r = row.props")
            tx.run(query, rows=rows).consume()
    require(snapshot(tx) == (nodes, edges), "Graph differs from input; transaction rolled back")
    return "Imported and verified: 833 nodes and 4638 relationships."

with GraphDatabase.driver(uri, auth=(user, password)) as driver:
    driver.verify_connectivity()
    with driver.session(database=database) as session:
        session.execute_read(preflight)
        # Schema statements commit separately from the data transaction.
        for label in LABELS.values():
            session.run(f"CREATE CONSTRAINT ontology_v09_{label.lower()}_id IF NOT EXISTS "
                        f"FOR (n:{label}) REQUIRE n.id IS UNIQUE").consume()
        print(session.execute_write(import_graph))
