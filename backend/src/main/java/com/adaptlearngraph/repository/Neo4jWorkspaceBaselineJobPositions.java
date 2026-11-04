package com.adaptlearngraph.repository;

import java.util.*;

/** Reads actual graph IDs from tenant-owned active catalog; no code/name-to-ID guessing or writes. */
public final class Neo4jWorkspaceBaselineJobPositions implements WorkspaceBaselineJobPositionPort {
    private final Neo4jCypher graph;private final int maximum;
    public Neo4jWorkspaceBaselineJobPositions(Neo4jCypher graph,int maximum) {
        if(maximum<1 || maximum==Integer.MAX_VALUE)throw new IllegalArgumentException("Positive catalog read bound required");
        this.graph=graph;this.maximum=maximum;
    }
    @Override public List<JobPosition> list(UUID organization,Set<String> shared) {
        Objects.requireNonNull(organization);
        // Neo4jClient: owned-or-shared projection with a computed ownership flag and a read bound (LIMIT maximum+1).
        try {
            return graph.read(tx->{
                var rows=tx.list("""
                        MATCH (o:JobPosition)
                        WHERE o.status='ACTIVE' AND (o.organizationId=$org OR (o.organizationId IS NULL AND o.id IN $shared))
                        RETURN o.id AS id,o.name AS name,o.organizationId=$org AS owned
                        ORDER BY o.name,o.id LIMIT $maximum
                        """,Map.of("org",organization.toString(),"shared",List.copyOf(shared),"maximum",maximum+1));
                if(rows.size()>maximum)throw new IllegalStateException("JobPosition catalog read limit exceeded");
                var ids=new HashSet<String>();var result=new ArrayList<JobPosition>();
                for(var row:rows) {
                    String id=row.get("id").asString(),name=row.get("name").asString();
                    if(id.isBlank() || !id.equals(id.strip()) || name.isBlank() || !ids.add(id))throw new IllegalStateException("Invalid or ambiguous JobPosition identity");
                    result.add(new JobPosition(id,name,row.get("owned").asBoolean(false)));
                }
                return List.copyOf(result);
            });
        }catch(RuntimeException unavailable){throw new IllegalStateException("Workspace JobPosition catalog unavailable",unavailable);}
    }
}
