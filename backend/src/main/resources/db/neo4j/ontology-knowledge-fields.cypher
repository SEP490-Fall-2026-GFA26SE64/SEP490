// Forward field-only definition, not an automatic startup/read operation.
// Parameters: organizationId plus requirements/skills from db/seed/ontology-knowledge-fields.json.
// Run only after an authorized operator verifies the before hash/IDs and saves a recovery snapshot.
// Each statement requires exact owned targets and expected old/new values; zero updated means stop, not success.

UNWIND $requirements AS item
MATCH (l:Level {id:item.fromId,organizationId:$organizationId})-[q:REQUIRES_SKILL {id:item.id}]->(s:MicroSkill {id:item.toId,organizationId:$organizationId})
WHERE q.organizationId IS NULL OR q.organizationId=$organizationId
WITH collect({edge:q,item:item}) AS changes,count(DISTINCT item.id) AS matchedIds
WHERE size(changes)=size($requirements) AND matchedIds=size($requirements)
  AND all(change IN changes WHERE change.edge.requiredScore=change.item.previousRequiredScore
      OR change.edge.requiredKnowledgeLevels=change.item.requiredKnowledgeLevels)
UNWIND changes AS change
WITH change.edge AS edge,change.item AS item
SET edge.requiredKnowledgeLevels=item.requiredKnowledgeLevels
REMOVE edge.requiredScore
RETURN count(edge) AS updatedRequirements;

UNWIND $skills AS item
MATCH (s:MicroSkill {id:item.id,organizationId:$organizationId})
OPTIONAL MATCH (m:LearningModule {organizationId:$organizationId})-[t:TEACHES]->(s)
WHERE m.status='ACTIVE' AND t.status='ACTIVE' AND (t.organizationId IS NULL OR t.organizationId=$organizationId)
WITH item,s,count(t)>0 AS hasModule
WITH collect({skill:s,item:item,hasModule:hasModule}) AS changes,count(DISTINCT item.id) AS matchedIds
WHERE size(changes)=size($skills) AND matchedIds=size($skills)
  AND all(change IN changes WHERE
      (change.hasModule AND change.item.provisionMode='MODULE_ONLY') OR
      (NOT change.hasModule AND change.item.provisionMode IS NULL))
UNWIND changes AS change
WITH change.skill AS skill,change.item AS item
SET skill.provisionMode=item.provisionMode
RETURN count(skill) AS updatedSkills;
