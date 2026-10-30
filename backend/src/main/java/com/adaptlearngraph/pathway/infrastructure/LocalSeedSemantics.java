package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

/** Exact local artifact compatibility, never an ID-only or numeric mastery conversion. */
final class LocalSeedSemantics implements Semantics {
    static final String VERSION="LOCAL_SEED_IDENTITY_V2";
    private static final String V010_HASH="fb4b308402e5413a246de65621f97df464d3538ad36264f40e827be005728b25";
    private static final String HISTORY_HASH="0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125";
    private static final String BANK_HASH="52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882";
    private final ObjectMapper json;
    private final String occupation,currentFingerprint;
    private final Map<String,String> currentSkills;
    private final Map<String,Map<String,String>> originalSkills;
    private record Edge(String kind,String from,String to,Map<String,Object> properties) {}
    private record Snapshot(String fingerprint,Map<String,String> skills) {}
    LocalSeedSemantics(ObjectMapper json,UUID organization,byte[] current,byte[] historical,byte[] bank,byte[] previous)throws java.io.IOException {
        this(json,organization,current,historical,bank,previous,false);
    }
    static LocalSeedSemantics softwareDevelopment(ObjectMapper json,UUID organization,byte[] current) throws java.io.IOException {
        return new LocalSeedSemantics(json,organization,current,current,com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed.bankBytes(),current,true);
    }
    private LocalSeedSemantics(ObjectMapper json,UUID organization,byte[] current,byte[] historical,byte[] bank,byte[] previous,boolean softwareDevelopment) throws java.io.IOException {
        this.json=json;
        requireHash(current,com.adaptlearngraph.assessment.infrastructure.LocalCatalogBootstrap.SOURCE_HASH);
        if(softwareDevelopment)requireHash(bank,com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed.BANK_HASH);
        else {requireHash(historical,HISTORY_HASH);requireHash(bank,BANK_HASH);requireHash(previous,V010_HASH);}
        var manifest=json.readTree(bank);occupation=manifest.path("occupationId").asText();
        var now=snapshot(current,organization);var old=snapshot(historical,organization);var v010=snapshot(previous,organization);
        currentFingerprint=now.fingerprint();currentSkills=now.skills();
        originalSkills=softwareDevelopment ? Map.of(eligibility(now.fingerprint(),organization,manifest),now.skills()) : Map.of(eligibility(old.fingerprint(),organization,manifest),old.skills(),
                eligibility(v010.fingerprint(),organization,manifest),v010.skills(),eligibility(now.fingerprint(),organization,manifest),now.skills());
    }
    @Override public Compatibility resolve(Binding binding,Profile profile) {
        if(!occupation.equals(binding.occupationId()) || !currentFingerprint.equals(binding.catalogFingerprint())
                || !VERSION.equals(binding.versions().get("compatibility")))throw new Failure(503,"SEMANTIC_SOURCE_NOT_SUPPORTED",false);
        var original=originalSkills.get(profile.catalogFingerprint());
        if(original==null)throw new Failure(503,"PROFILE_CATALOG_NOT_SUPPORTED",false);
        var compatible=new TreeMap<String,com.adaptlearngraph.recommendation.domain.RoleGap.Evidence>();
        for(var entry:profile.evidence().entrySet()) {
            String id=entry.getKey();
            if(!original.containsKey(id))throw new Failure(503,"PROFILE_INTEGRITY_FAILURE",false);
            if(currentSkills.containsKey(id)) {
                if(!original.get(id).equals(currentSkills.get(id)))throw new Failure(503,"SKILL_SEMANTICS_CHANGED",false);
                compatible.put(id,entry.getValue()); // The exact original decimal mastery/confidence is retained.
            }
        }
        var unknown=new TreeMap<String,String>();
        for(var requirement:binding.requirements()) {
            if(!currentSkills.containsKey(requirement.skillId()))throw new Failure(503,"SEMANTIC_SOURCE_NOT_SUPPORTED",false);
            if(!compatible.containsKey(requirement.skillId()))unknown.put(requirement.skillId(),"NOT_IN_ORIGINAL_PROFILE");
        }
        return new Compatibility(compatible,unknown,VERSION);
    }
    private Snapshot snapshot(byte[] bytes,UUID organization)throws java.io.IOException {
        var data=json.readTree(bytes);var nodes=new HashMap<String,Map<String,Object>>();
        for(String group:List.of("Occupations","TargetRoles","Levels","MicroSkills"))for(var row:data.path(group)) {
            var properties=properties(row);properties.remove("occupationId");properties.remove("targetRoleId");properties.remove("levelId");
            if(nodes.put((String)properties.get("id"),properties)!=null)throw new IllegalStateException("Duplicate source identity");
        }
        var edges=new ArrayList<Edge>();
        for(var row:data.path("relationships")) {
            var properties=properties(row);
            edges.add(new Edge((String)properties.remove("type"),(String)properties.remove("fromId"),(String)properties.remove("toId"),properties));
        }
        var paths=new TreeSet<String>();var skills=new TreeMap<String,String>();
        paths.add(encode(Map.of("occupation",nodes.get(occupation))));
        for(var membership:edges)if(membership.kind().equals("HAS_ROLE") && membership.from().equals(occupation)) {
            String role=membership.to();paths.add(encode(Map.of("role",nodes.get(role),"membership",membership.properties())));
            for(var roleLevel:edges)if(roleLevel.kind().equals("HAS_LEVEL") && roleLevel.from().equals(role))
                for(var requirement:edges)if(requirement.kind().equals("REQUIRES_SKILL") && requirement.from().equals(roleLevel.to())) {
                    var skill=nodes.get(requirement.to());
                    paths.add(encode(Map.of("roleId",role,"level",nodes.get(roleLevel.to()),"roleLevel",roleLevel.properties(),
                            "requirement",requirement.properties(),"skill",skill)));
                    var semanticProperties=new TreeMap<>(skill);semanticProperties.remove("version");
                    skills.put(requirement.to(),encode(semanticProperties));
                }
        }
        return new Snapshot(hash("AB-CATALOG-V1:"+organization+":"+encode(paths)),Map.copyOf(skills));
    }
    private String eligibility(String catalog,UUID organization,JsonNode manifest) {
        var items=new TreeSet<String>();
        for(var item:manifest.path("items"))items.add(encode(List.of(item.path("itemVersionId").asText(),
                item.path("microSkillId").asText(),item.path("contentHash").asText())));
        return hash("AB-ELIGIBILITY-V1:"+catalog+":"+organization+":"+occupation+":"+manifest.path("questionBank").path("id").asText()+":"+encode(items));
    }
    private Map<String,Object> properties(JsonNode node) {
        Map<String,Object> result=json.convertValue(node,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
        result.values().removeIf(Objects::isNull);return result;
    }
    private String encode(Object value) {
        try{return json.writeValueAsString(sorted(json.valueToTree(value)));}
        catch(java.io.IOException invalid){throw new IllegalStateException("Cannot encode catalog compatibility",invalid);}
    }
    private JsonNode sorted(JsonNode value) {
        if(value.isObject()) {
            ObjectNode result=json.createObjectNode();var keys=new TreeSet<String>();value.fieldNames().forEachRemaining(keys::add);
            keys.forEach(k->result.set(k,sorted(value.get(k))));return result;
        }
        if(value.isArray()){var result=json.createArrayNode();value.forEach(v->result.add(sorted(v)));return result;}
        return value;
    }
    private static void requireHash(byte[] bytes,String expected) {
        if(!digest(bytes).equals(expected))throw new IllegalStateException("Local compatibility source drift");
    }
    private static String hash(String value){return digest(value.getBytes(StandardCharsets.UTF_8));}
    private static String digest(byte[] bytes) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
        catch(NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}
    }
}
