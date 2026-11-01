package com.adaptlearngraph.repository;

import java.util.*;
import org.neo4j.driver.Driver;
import org.neo4j.driver.AccessMode;
import org.neo4j.driver.SessionConfig;

/** Reads actual graph IDs from tenant-owned active catalog; no code/name-to-ID guessing or writes. */
public final class Neo4jWorkspaceBaselineOccupations implements WorkspaceBaselineOccupationPort {
    private final Driver driver;private final int maximum;
    public Neo4jWorkspaceBaselineOccupations(Driver driver,int maximum) {
        if(maximum<1 || maximum==Integer.MAX_VALUE)throw new IllegalArgumentException("Positive catalog read bound required");
        this.driver=driver;this.maximum=maximum;
    }
    @Override public List<Occupation> list(UUID organization,Set<String> shared) {
        Objects.requireNonNull(organization);
        try(var session=driver.session(SessionConfig.builder().withDefaultAccessMode(AccessMode.READ).build())) {
            return session.executeRead(tx->{
                var rows=tx.run("""
                        MATCH (o:Occupation)
                        WHERE o.status='ACTIVE' AND (o.organizationId=$org OR (o.organizationId IS NULL AND o.id IN $shared))
                        RETURN o.id AS id,o.name AS name,o.organizationId=$org AS owned
                        ORDER BY o.name,o.id LIMIT $maximum
                        """,Map.of("org",organization.toString(),"shared",List.copyOf(shared),"maximum",maximum+1)).list();
                if(rows.size()>maximum)throw new IllegalStateException("Occupation catalog read limit exceeded");
                var ids=new HashSet<String>();var result=new ArrayList<Occupation>();
                for(var row:rows) {
                    String id=row.get("id").asString(),name=row.get("name").asString();
                    if(id.isBlank() || !id.equals(id.strip()) || name.isBlank() || !ids.add(id))throw new IllegalStateException("Invalid or ambiguous Occupation identity");
                    result.add(new Occupation(id,name,row.get("owned").asBoolean(false)));
                }
                return List.copyOf(result);
            });
        }catch(RuntimeException unavailable){throw new IllegalStateException("Workspace Occupation catalog unavailable",unavailable);}
    }
}
