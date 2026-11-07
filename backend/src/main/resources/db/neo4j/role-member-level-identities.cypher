// Forward metadata migration for explicitly authorized $organizationId and $roleIds only.
// Do not run automatically on a configuration read. Retain requirement edges, tokens, order and history.
// Preflight: this query must return no ambiguous existing identities before applying the next statement.
MATCH (r:TargetRole {organizationId:$organizationId})-[:HAS_LEVEL]->(l:Level {sourceFormat:'AUTHORED_ROLE_MEMBER_V1'})
WHERE r.id IN $roleIds
WITH r,l.memberToken AS token,collect(l.id) AS ids WHERE size(ids)>1
RETURN r.id AS roleId,token,ids;

// Existing typed memberships remain under their owning catalog adapter.
MATCH (r:TargetRole {organizationId:$organizationId})
WHERE r.id IN $roleIds AND r.levels IS NOT NULL AND NOT EXISTS {
    MATCH (r)-[:HAS_LEVEL]->(l:Level) WHERE l.sourceFormat IS NULL OR l.sourceFormat<>'AUTHORED_ROLE_MEMBER_V1'
}
UNWIND range(0,size(r.levels)-1) AS rank
WITH r,rank,r.levels[rank] AS token WHERE token IS NOT NULL
OPTIONAL MATCH (r)-[:HAS_LEVEL]->(prior:Level {organizationId:$organizationId,sourceFormat:'AUTHORED_ROLE_MEMBER_V1',memberToken:token})
WITH r,rank,token,collect(prior) AS retained WHERE size(retained)<=1
WITH r,rank,token,CASE WHEN size(retained)=1 THEN head(retained).id ELSE randomUUID() END AS memberId
MERGE (l:Level {id:memberId})
SET l.organizationId=$organizationId,l.memberToken=token,l.code=memberId,l.name=token,l.rank=rank,
    l.status='ACTIVE',l.version=r.version,l.sourceFormat='AUTHORED_ROLE_MEMBER_V1'
MERGE (r)-[h:HAS_LEVEL]->(l)
SET h.organizationId=$organizationId,h.status='ACTIVE'
RETURN r.id AS roleId,token,l.id AS memberLevelId;
