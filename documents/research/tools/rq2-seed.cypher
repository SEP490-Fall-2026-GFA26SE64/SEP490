// Run only against a fresh, dedicated RQ2 Neo4j instance.
// Pass nodes = 1000, 5000 or 10000 via cypher-shell --param.
CREATE CONSTRAINT rq2_skill_id IF NOT EXISTS FOR (n:MicroSkill) REQUIRE n.id IS UNIQUE;
UNWIND range(0, $nodes - 1) AS i
MERGE (:MicroSkill {id: 'RQ2-' + toString(i)});
UNWIND range(0, $nodes - 1) AS i
WITH i WHERE i % 10 > 0
MATCH (source:MicroSkill {id: 'RQ2-' + toString(i)})
MATCH (same:MicroSkill {id: 'RQ2-' + toString(i - 1)})
MATCH (next:MicroSkill {id: 'RQ2-' + toString((i + 10) % $nodes - 1)})
MERGE (source)-[:HAS_SKILL_PREREQUISITE]->(same)
MERGE (source)-[:HAS_SKILL_PREREQUISITE]->(next);
MATCH (n) RETURN count(n) AS nodes;
MATCH ()-[r]->() RETURN count(r) AS relationships;
