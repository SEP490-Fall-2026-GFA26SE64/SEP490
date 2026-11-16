package com.adaptlearngraph.repository;

import java.util.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;

public final class JpaKnowledgeJourneyReader implements KnowledgeJourneyPort {
    private final KnowledgeJourneyJpaRepository data;private final Neo4jCypher graph;
    public JpaKnowledgeJourneyReader(KnowledgeJourneyJpaRepository data,Neo4jCypher graph){this.data=data;this.graph=graph;}
    @Override public List<Target> targets(UUID org,UUID learner,int limit,int offset) {
        return data.targets(org,learner,limit,offset).stream().map(r->new Target(r.getId(),r.getRoleId(),r.getJobPositionId(),
                r.getSnapshot(),r.getRevision(),r.getSelectedAt(),r.getCurrent(),r.getFrozenInput())).toList();
    }
    @Override public Map<String,String> currentVersions(UUID org,Set<String> ids) {
        if(ids.isEmpty())return Map.of();if(ids.size()>1000)throw new Failure(422,"JOURNEY_CATALOG_CAPACITY");
        return graph.read(5,tx->{
            var rows=tx.list("""
                    MATCH (s:MicroSkill {organizationId:$org})
                    WHERE s.id IN $ids AND s.status='ACTIVE' AND s.reviewStatus='APPROVED'
                    RETURN s.id AS id,s.version AS version LIMIT 1001
                    """,Map.of("org",org.toString(),"ids",new ArrayList<>(ids)));
            var versions=new HashMap<String,String>();var seen=new HashSet<String>();
            for(var row:rows) {
                String id=row.get("id").asString();if(!seen.add(id))throw new Failure(503,"JOURNEY_CATALOG_AMBIGUOUS");
                if(!row.get("version").isNull() && !row.get("version").asString().isBlank())versions.put(id,row.get("version").asString());
            }
            return Map.copyOf(versions);
        });
    }
}
