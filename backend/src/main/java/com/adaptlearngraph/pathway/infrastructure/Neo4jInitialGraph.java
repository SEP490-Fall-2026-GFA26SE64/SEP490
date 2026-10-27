package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.RoleReference;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;
import org.neo4j.driver.Session;
import org.neo4j.driver.TransactionContext;

/** Batch adjacency closure, not all-simple-path enumeration. No current mutable graph fallback. */
public final class Neo4jInitialGraph implements Graphs {
    /** Owner must supply a session pinned to the exact immutable published release, or deny. */
    public interface PublishedSessions { Session open(Scope scope,RoleReference reference); }
    private final PublishedSessions sessions;
    private final boolean localReview;
    public Neo4jInitialGraph(PublishedSessions sessions) { this(sessions,false); }
    public Neo4jInitialGraph(PublishedSessions sessions,boolean localReview) { this.sessions=sessions;this.localReview=localReview; }
    @Override public Graph load(Scope scope,Binding binding,Set<String> seeds,Limits limits) {
        if(seeds.isEmpty()) throw new Failure(422,"EMPTY_LEARNING_NEED");
        if(seeds.size()>limits.maxClosureNodes())throw new Failure(422,"CATALOG_LIMIT",false);
        try(var session=sessions.open(scope,RoleReference.from(scope,binding))) {
            return session.executeRead(tx->read(tx,scope,binding,seeds,limits));
        } catch(Failure failure) { throw failure; }
        catch(org.neo4j.driver.exceptions.Neo4jException unavailable) { throw new Failure(503,"CATALOG_UNAVAILABLE"); }
        catch(RuntimeException invalid) { throw new Failure(503,"CATALOG_INCOMPATIBLE",false); }
    }
    private Graph read(TransactionContext tx,Scope scope,Binding binding,Set<String> seeds,Limits limits) {
        String version=binding.versions().get("catalog");
        var visited=new TreeSet<String>(); var frontier=new TreeSet<>(seeds); var edges=new ArrayList<Edge>();
        var edgeKeys=new HashSet<List<String>>();
        var identities=new HashMap<List<String>,String>();
        while(!frontier.isEmpty()) {
            var batch=frontier.stream().limit(limits.batchSize()).toList(); frontier.removeAll(batch);
            long rowLimit=(long)limits.maxClosureEdges()-edges.size()+batch.size();
            var rows=tx.run("""
                    UNWIND $ids AS id
                    OPTIONAL MATCH (s:MicroSkill {id:id})
                    OPTIONAL MATCH (s)-[e:HAS_SKILL_PREREQUISITE]->(p:MicroSkill)
                    WHERE e.status='ACTIVE'
                    RETURN id,properties(s) AS s,properties(e) AS e,properties(p) AS p,
                        elementId(s) AS si,elementId(e) AS ei,elementId(p) AS pi
                    ORDER BY id,p.id LIMIT $maximum
                    """,Map.of("ids",batch,"maximum",rowLimit+1)).list();
            if(rows.size()>rowLimit)throw new Failure(422,"CATALOG_LIMIT",false);
            var found=new HashSet<String>();
            for(var row:rows) {
                String id=row.get("id").asString(); found.add(id);InitialCatalogMetadata.requirePublished(row.get("s"),scope,version,localReview);
                InitialCatalogMetadata.unique(identities,"MicroSkill",row.get("s"),row.get("si").asString());
                visited.add(id);
                if(!row.get("e").isNull()) {
                    InitialCatalogMetadata.requirePublished(row.get("e"),scope,version,localReview);InitialCatalogMetadata.requirePublished(row.get("p"),scope,version,localReview);
                    InitialCatalogMetadata.unique(identities,"relationship",row.get("e"),row.get("ei").asString());
                    InitialCatalogMetadata.unique(identities,"MicroSkill",row.get("p"),row.get("pi").asString());
                    String prerequisite=row.get("p").get("id").asString();
                    if(!edgeKeys.add(List.of(id,prerequisite))) throw new Failure(503,"DUPLICATE_PREREQUISITE_EDGE");
                    edges.add(new Edge(id,prerequisite,InitialCatalogMetadata.decimal(row.get("e"),"requiredScore")));
                    if(!visited.contains(prerequisite)) frontier.add(prerequisite);
                }
            }
            if(!found.containsAll(batch)) throw new Failure(503,"CATALOG_SKILL_MISSING");
            frontier.removeAll(visited);
            if(visited.size()+frontier.size()>limits.maxClosureNodes() || edges.size()>limits.maxClosureEdges()) throw new Failure(422,"CATALOG_LIMIT");
        }
        var providers=new ArrayList<Provider>(); var pairs=new HashSet<List<String>>(); var ids=new ArrayList<>(visited);int scanned=0;
        for(int offset=0;offset<ids.size();offset+=limits.batchSize()) {
            var batch=ids.subList(offset,Math.min(ids.size(),offset+limits.batchSize()));
            long remaining=(long)limits.maxProviders()-scanned;
            var rows=tx.run("""
                    MATCH (m:LearningModule)-[t:TEACHES]->(s:MicroSkill)
                    WHERE s.id IN $ids AND m.status='ACTIVE' AND t.status='ACTIVE'
                      AND all(n IN [m,t,s] WHERE n.organizationId IS NULL OR n.organizationId=$org)
                    RETURN properties(m) AS m,properties(t) AS t,properties(s) AS s,s.id AS skill,
                        elementId(m) AS mi,elementId(t) AS ti,elementId(s) AS si ORDER BY m.id,s.id LIMIT $maximum
                    """,Map.of("ids",batch,"org",scope.organizationId().toString(),"maximum",remaining+1)).list();
            if(rows.size()>remaining)throw new Failure(422,"CATALOG_LIMIT",false);scanned+=rows.size();
            for(var row:rows) {
                var module=row.get("m"); String id=module.get("id").asString(), skill=row.get("skill").asString();
                if(!pairs.add(List.of(id,skill))) throw new Failure(503,"DUPLICATE_PROVIDER_PAIR");
                InitialCatalogMetadata.requirePublished(row.get("s"),scope,version,localReview);
                InitialCatalogMetadata.unique(identities,"MicroSkill",row.get("s"),row.get("si").asString());
                InitialCatalogMetadata.unique(identities,"LearningModule",module,row.get("mi").asString());
                InitialCatalogMetadata.unique(identities,"relationship",row.get("t"),row.get("ti").asString());
                boolean modulePublished=InitialCatalogMetadata.published(module,scope,version,localReview);
                boolean mappingPublished=InitialCatalogMetadata.published(row.get("t"),scope,version,localReview);
                if(!modulePublished || !mappingPublished)continue;
                InstructionLevel level;
                try { level=InstructionLevel.valueOf(row.get("t").get("instructionLevel").asString()); }
                catch(RuntimeException invalid) { throw new Failure(503,"INSTRUCTION_LEVEL_CONTRACT_REQUIRED"); }
                var duration=InitialCatalogMetadata.decimal(module,"duration");var price=InitialCatalogMetadata.decimal(module,"price");
                if(duration.signum()<=0 || duration.stripTrailingZeros().scale()>0 || price.signum()<=0)throw new Failure(503,"CATALOG_MODULE_METADATA_INVALID",false);
                providers.add(new Provider(id,InitialCatalogMetadata.text(module,"title"),InitialCatalogMetadata.text(module,"contentVersion"),duration,price,skill,level));
                if(providers.size()>limits.maxProviders()) throw new Failure(422,"CATALOG_LIMIT");
            }
        }
        return new Graph(visited,edges,providers,binding.releaseToken());
    }
}
