package com.adaptlearngraph.repository;

import com.adaptlearngraph.config.MainDevelopmentBankSeed;
import com.adaptlearngraph.config.SoftwareDevelopmentSeed;
import com.adaptlearngraph.repository.InitialCatalogPort.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.*;
import org.neo4j.driver.Value;
import org.springframework.core.env.Environment;

/** TMP-MA-MAIN-GAP-20261101: exact main development source, never production publication. */
public final class MainDevelopmentCatalogRelease implements ReleaseAuthority {
    public record Sessions(MainDevelopmentCatalogRelease release) implements Neo4jInitialGraph.PublishedSessions {
        public Neo4jCypher open(Scope scope,RoleReference reference){return release.open(scope,reference);}
    }
    private LocalReviewCatalogRelease source;
    private Neo4jAdaptiveBaselineCatalogAdapter catalog;
    private Map<String,LocalSeedSemantics> semantics;
    private String token;
    private final Neo4jCypher graph;
    private final ObjectMapper json;
    private final Environment env;
    private volatile boolean initialized;

    public MainDevelopmentCatalogRelease(Neo4jCypher graph,ObjectMapper json,Environment env) {
        if(!com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(env)
                || !env.acceptsProfiles(org.springframework.core.env.Profiles.of("local & workspace-baseline & !local-baseline-demo & !prod"))
                || !env.getProperty("pathway.initial.catalog.allow-review-seed",Boolean.class,false))throw new IllegalStateException("Main development catalog gates required");
        this.graph=graph;
        this.json=json;
        this.env=env;
    }
    /** Account/catalog bootstrap runs after bean creation; read only when a request needs the release. */
    private synchronized void initialize() {
        if(initialized)return;
        try {
            byte[] current=Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
            source=new LocalReviewCatalogRelease(graph,MainDevelopmentBankSeed.ORGANIZATION,current,env.getProperty("pathway.initial.readiness.version"),true);
            var metadata=metadata(graph,json,current);
            var scopes=Set.of("OCC-15-1212.00",SoftwareDevelopmentSeed.OCCUPATION);
            catalog=new Neo4jAdaptiveBaselineCatalogAdapter(graph,json,MainDevelopmentBankSeed.ORGANIZATION,scopes,true);
            var sources=new TreeMap<String,LocalSeedSemantics>();
            for(String occupation:scopes) {
                boolean se=SoftwareDevelopmentSeed.OCCUPATION.equals(occupation);
                byte[] historical=se?current:Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.history-v08-file","/seed/baseline-history-v08.json")));
                byte[] bank=se?SoftwareDevelopmentSeed.bankBytes():Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.bank-v08-file","/seed/baseline-bank-v08.json")));
                byte[] previous=se?current:Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.history-v010-file","/seed/baseline-history-v010.json")));
                var semantic=LocalSeedSemantics.mainDevelopment(json,MainDevelopmentBankSeed.ORGANIZATION,current,historical,bank,previous,se,metadata);
                if(!snapshot(occupation).equals(semantic.fingerprint()))throw new IllegalStateException("Main development catalog metadata/fingerprint mismatch");
                sources.put(occupation,semantic);
            }
            semantics=Map.copyOf(sources);
            var fingerprints=new TreeMap<String,String>();sources.forEach((id,s)->fingerprints.put(id,s.fingerprint()));
            token=com.adaptlearngraph.services.RoleBaselineFlow.hash(json.writeValueAsString(List.of(MainDevelopmentBankSeed.ORGANIZATION,
                    fingerprints,scopes.stream().sorted().map(MainDevelopmentBankSeed::projectionHash).toList())));
            initialized=true;
        }catch(java.io.IOException invalid){throw new IllegalStateException("Main development gap source unavailable",invalid);}
    }
    @Override public Release require(Scope scope) {
        if(!MainDevelopmentBankSeed.ORGANIZATION.equals(scope.organizationId()))throw new Failure(503,"CATALOG_RELEASE_NOT_CONFIGURED",false);
        if(!initialized)initialize();
        var versions=new TreeMap<>(source.require(scope).versions());versions.put("developmentBankNamespace","workspace-seed:v2");
        if(source.hasSoftwareDevelopment())versions.put("developmentSeed",SoftwareDevelopmentSeed.MODULES_HASH);
        return new Release(MainDevelopmentBankSeed.ORGANIZATION,"main-development:"+token,versions);
    }
    @Override public void assertCurrent(Scope scope,RoleReference ref) {
        var current=require(scope);
        if(!scope.organizationId().equals(ref.organizationId()) || !semantics.containsKey(ref.occupationId()))throw new Failure(503,"CATALOG_RELEASE_NOT_CONFIGURED",false);
        if(!current.token().equals(ref.releaseToken()) || current.versions().entrySet().stream().anyMatch(e->!e.getValue().equals(ref.versions().get(e.getKey())))
                || !snapshot(ref.occupationId()).equals(ref.catalogFingerprint()) || !semantics.get(ref.occupationId()).fingerprint().equals(ref.catalogFingerprint()))
            throw new Failure(409,"CATALOG_RELEASE_CHANGED",false);
    }
    Neo4jCypher open(Scope scope,RoleReference ref) {
        assertCurrent(scope,ref);
        var original=new RoleReference(ref.organizationId(),ref.businessRoleId(),ref.roleId(),ref.levelId(),ref.occupationId(),ref.catalogFingerprint(),source.require(scope).token(),ref.versions());
        return source.open(scope,original);
    }
    public Semantics semantics() {
        return new Semantics() {
            public Compatibility resolve(Binding binding,Profile profile){throw new Failure(503,"TRUSTED_SEMANTIC_SCOPE_REQUIRED",false);}
            @Override public Compatibility resolve(Scope scope,Binding binding,Profile profile) {
                assertCurrent(scope,RoleReference.from(scope,binding));
                return semantics.get(binding.occupationId()).resolve(binding,profile);
            }
        };
    }
    private String snapshot(String occupation) {
        return catalog.findAvailable(new com.adaptlearngraph.entities.AdaptiveBlueprint.Scope(MainDevelopmentBankSeed.ORGANIZATION,occupation))
                .orElseThrow(()->new Failure(503,"CATALOG_RELEASE_NOT_CONFIGURED",false)).fingerprint();
    }
    private static Map<String,Map<String,Object>> metadata(Neo4jCypher graph,ObjectMapper json,byte[] seed)throws java.io.IOException {
        var root=json.readTree(seed);var ids=new HashSet<String>();
        for(String group:List.of("Occupations","TargetRoles","Levels","MicroSkills"))for(var node:root.path(group))ids.add(node.path("id").asText());
        if(ids.isEmpty() || ids.size()>10000 || ids.contains(""))throw new IllegalStateException("Invalid bounded development source");
        // Neo4jClient: label-agnostic id lookup returning labels and raw properties (no single @Node type applies).
        return graph.read(tx->{
            var rows=tx.list("MATCH (n) WHERE n.id IN $ids RETURN n.id AS id,labels(n) AS labels,properties(n) AS props LIMIT $maximum",Map.of("ids",List.copyOf(ids),"maximum",ids.size()+1));
            var seen=new HashSet<String>();var result=new TreeMap<String,Map<String,Object>>();
            for(var row:rows) {
                var labels=row.get("labels").asList(Value::asString);var props=row.get("props");
                if(!seen.add(row.get("id").asString()) || labels.size()!=1 || !MainDevelopmentBankSeed.ORGANIZATION.toString().equals(props.get("organizationId").asString(null)))
                    throw new IllegalStateException("Invalid development source ownership");
                var values=new TreeMap<String,Object>();
                for(String key:List.of("organizationId","assignedExpertId","assignedExpertName"))if(!props.get(key).isNull())values.put(key,props.get(key).asString());
                var previous=result.putIfAbsent(labels.getFirst(),Map.copyOf(values));
                if(previous!=null && !previous.equals(values))throw new IllegalStateException("Development metadata is not a coherent source");
            }
            if(!seen.equals(ids))throw new IllegalStateException("Development source membership incomplete");
            return Map.copyOf(result);
        });
    }
}
