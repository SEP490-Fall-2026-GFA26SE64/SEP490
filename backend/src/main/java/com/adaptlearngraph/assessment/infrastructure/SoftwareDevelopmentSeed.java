package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Exact shared-development inputs. No catalog/schema version, learner outcome or publication change. */
public final class SoftwareDevelopmentSeed {
    public static final String OCCUPATION="OCC-15-1252.00";
    public static final String MODULES_HASH="3ece80a4a63043b5044ad46f82e9503da12bf9fa1a8eaeee3378034817bb1a1a";
    public static final String BANK_HASH="8922129d2d67ec8ec9736ae1aa560e2af992fe82633464aebeea6c09ad034552";
    private SoftwareDevelopmentSeed() {}
    public static UUID id(String name) { return UUID.nameUUIDFromBytes(("WORKSPACE_SE:"+name).getBytes(StandardCharsets.UTF_8)); }
    public static byte[] modules() throws IOException { return resource("se-modules.json",MODULES_HASH); }
    public static byte[] bankBytes() throws IOException { return resource("question-bank-se.json",BANK_HASH); }
    private static byte[] resource(String name,String hash) throws IOException {
        try(var stream=SoftwareDevelopmentSeed.class.getResourceAsStream("/db/seed/"+name)) {
            if(stream==null)throw new IOException("Missing SE seed: "+name);
            var bytes=stream.readAllBytes();require(hash.equals(sha256(bytes)),"SE seed hash drift: "+name);return bytes;
        }
    }
    public static JsonNode supplement() throws IOException {
        return JSON.readTree(modules());
    }
    static OfficialQuestionBankManifest bank(byte[] graph) throws IOException {
        var root=JSON.readTree(graph);var edges=root.path("relationships");
        var roles=new HashSet<String>();var levels=new HashSet<String>();var skills=new TreeSet<String>();
        for(var e:edges)if("HAS_ROLE".equals(e.path("type").asText()) && OCCUPATION.equals(e.path("fromId").asText()))roles.add(e.path("toId").asText());
        for(var e:edges)if("HAS_LEVEL".equals(e.path("type").asText()) && roles.contains(e.path("fromId").asText()))levels.add(e.path("toId").asText());
        for(var e:edges)if("REQUIRES_SKILL".equals(e.path("type").asText()) && levels.contains(e.path("fromId").asText()))skills.add(e.path("toId").asText());
        var nodes=new ArrayList<OfficialQuestionBankCatalog.Node>();
        for(var row:root.path("MicroSkills"))if(skills.contains(row.path("id").asText())) {
            Map<String,Object> props=JSON.convertValue(row,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
            nodes.add(new OfficialQuestionBankCatalog.Node("MicroSkill",props));
        }
        var bank=parse(bankBytes(),OfficialQuestionBankManifest.class);
        require(bank.questionBank().id().equals(id("bank")) && OCCUPATION.equals(bank.occupationId()),"SE bank identity drift");
        bank.validate(new OfficialQuestionBankCatalog.Scope(LocalCatalogBootstrap.LEGACY_SOURCE_HASH,OCCUPATION,LocalCatalogBootstrap.VERSION,nodes,List.of()),40);
        return bank;
    }
    public static String technicalHash() {
        return sha256((BANK_HASH+":DECLARED_SYNTHETIC:a=1.5;b=-1,0,1;c=0.25:reference-model-and-mapping").getBytes(StandardCharsets.UTF_8));
    }
}
