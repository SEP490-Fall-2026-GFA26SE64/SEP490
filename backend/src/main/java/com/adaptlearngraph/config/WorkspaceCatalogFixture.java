package com.adaptlearngraph.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/** Explicit external test manifest; grants and catalog ownership are still checked by their readers. */
public record WorkspaceCatalogFixture(String id,String fingerprint,Map<UUID,Map<String,String>> organizations,Map<UUID,Workspace> workspaces) {
    public record Workspace(UUID ldId,UUID expertId,Map<String,Map<String,Object>> nodeMetadata) {
        public Workspace {
            Objects.requireNonNull(ldId);Objects.requireNonNull(expertId);
            var copy=new HashMap<String,Map<String,Object>>();nodeMetadata.forEach((label,values)->copy.put(label,Map.copyOf(values)));nodeMetadata=Map.copyOf(copy);
        }
    }
    public record Bank(UUID organizationId,String jobPositionId,UUID ldId,UUID bankId,UUID modelId,UUID mappingId,UUID parameterSetId) {}
    public WorkspaceCatalogFixture(String id,String fingerprint,Map<UUID,Map<String,String>> organizations) {this(id,fingerprint,organizations,Map.of());}
    public WorkspaceCatalogFixture {
        var copy=new HashMap<UUID,Map<String,String>>();
        organizations.forEach((org,jobPositions)->copy.put(Objects.requireNonNull(org),Map.copyOf(jobPositions)));
        organizations=Map.copyOf(copy);
        workspaces=Map.copyOf(workspaces);
        if(!organizations.keySet().containsAll(workspaces.keySet()))throw new IllegalArgumentException("Fixture workspace has no catalog scope");
    }
    public static WorkspaceCatalogFixture load(Environment env,ObjectMapper json) {
        if(!env.getProperty("pathway.initial.workspace-fixture.enabled",Boolean.class,false))
            return new WorkspaceCatalogFixture("disabled","",Map.of());
        if(!env.acceptsProfiles(Profiles.of("local & workspace-baseline & workspace-development & !local-baseline-demo & !prod"))
                || !env.getProperty("workspace.development-fixtures.enabled",Boolean.class,false))
            throw new IllegalStateException("Workspace catalog fixture requires explicit non-production development gates");
        try {
            byte[] bytes=Files.readAllBytes(Path.of(env.getRequiredProperty("pathway.initial.workspace-fixture.manifest")));
            String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            if(!hash.equals(env.getRequiredProperty("pathway.initial.workspace-fixture.sha256")))
                throw new IllegalArgumentException("Workspace fixture manifest hash mismatch");
            var root=json.readTree(bytes);String id=root.path("id").asText();
            if(!id.matches("[A-Za-z0-9-]{1,80}") || !root.path("organizations").isObject())
                throw new IllegalArgumentException("Invalid workspace fixture manifest");
            var scopes=new HashMap<UUID,Map<String,String>>();
            var entries=root.path("organizations").fields();
            while(entries.hasNext()) {
                var entry=entries.next();var jobPositions=new HashMap<String,String>();
                if(!entry.getValue().isObject())throw new IllegalArgumentException("Invalid fixture jobPositions");
                var values=entry.getValue().fields();
                while(values.hasNext()) {
                    var value=values.next();
                    if(!value.getKey().matches("OCC-[0-9]{2}-[0-9]{4}\\.[0-9]{2}")
                            || !value.getValue().isTextual() || !value.getValue().asText().matches("[0-9a-f]{64}")
                            || jobPositions.put(value.getKey(),value.getValue().asText())!=null)
                        throw new IllegalArgumentException("Invalid fixture jobPosition/fingerprint");
                }
                if(jobPositions.isEmpty() || scopes.put(UUID.fromString(entry.getKey()),jobPositions)!=null)
                    throw new IllegalArgumentException("Invalid fixture organization");
            }
            if(scopes.isEmpty())throw new IllegalArgumentException("Empty workspace fixture");
            var workspaces=new HashMap<UUID,Workspace>();
            var workspaceEntries=root.path("workspaces").fields();
            while(workspaceEntries.hasNext()) {
                var entry=workspaceEntries.next();var value=entry.getValue();
                UUID org=UUID.fromString(entry.getKey()),expert=UUID.fromString(value.path("expertId").asText());
                var metadata=new HashMap<String,Map<String,Object>>();var labels=value.path("nodeMetadata").fields();
                while(labels.hasNext()) {
                    var label=labels.next();
                    if(!Set.of("JobPosition","TargetRole","Level","MicroSkill").contains(label.getKey()) || !label.getValue().isObject())
                        throw new IllegalArgumentException("Unsupported fixture metadata label");
                    Map<String,Object> properties=json.convertValue(label.getValue(),new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
                    if(!Set.of("organizationId","assignedExpertId","assignedExpertName").containsAll(properties.keySet())
                            || properties.containsKey("organizationId") && !org.toString().equals(properties.get("organizationId")))
                        throw new IllegalArgumentException("Invalid fixture administrative metadata");
                    if(properties.containsKey("assignedExpertId"))UUID.fromString((String)properties.get("assignedExpertId"));
                    metadata.put(label.getKey(),properties);
                }
                workspaces.put(org,new Workspace(UUID.fromString(value.path("ldId").asText()),expert,metadata));
            }
            return new WorkspaceCatalogFixture(id,hash,scopes,workspaces);
        }catch(Exception invalid){throw new IllegalStateException("Workspace catalog fixture unavailable",invalid);}
    }
    public boolean active(){return !organizations.isEmpty();}
    public boolean permits(UUID org,String jobPosition){return organizations.getOrDefault(org,Map.of()).containsKey(jobPosition);}
    public boolean matches(UUID org,String jobPosition,String catalogFingerprint){return catalogFingerprint!=null && catalogFingerprint.equals(organizations.getOrDefault(org,Map.of()).get(jobPosition));}
    public boolean covers(UUID org,Set<String> jobPositions){return !jobPositions.isEmpty() && organizations.getOrDefault(org,Map.of()).keySet().containsAll(jobPositions);}
    public static UUID identity(UUID org,String name) {
        return UUID.nameUUIDFromBytes(("WORKSPACE_PLATFORM_FIXTURE:"+org+":"+name).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
    public Optional<Bank> bank(UUID org,String jobPosition) {
        if(!permits(org,jobPosition) || !workspaces.containsKey(org))return Optional.empty();
        if(!Set.of("OCC-15-1212.00","OCC-15-1252.00").contains(jobPosition))throw new IllegalStateException("Unsupported baseline fixture artifact");
        return Optional.of(new Bank(org,jobPosition,workspaces.get(org).ldId(),identity(org,"bank:"+jobPosition),identity(org,"model:"+jobPosition),
                identity(org,"mapping:"+jobPosition),identity(org,"parameters:"+jobPosition)));
    }
    public List<Bank> banks() {
        return workspaces.keySet().stream().flatMap(org->organizations.get(org).keySet().stream().map(jobPosition->bank(org,jobPosition).orElseThrow())).toList();
    }
}
