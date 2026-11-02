package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.entities.IrtItemParameterEntity;
import com.adaptlearngraph.entities.IrtParameterSetEntity;
import com.adaptlearngraph.repository.DevelopmentSeedRepositories;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.boot.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.support.TransactionTemplate;

/** Idempotent explicit demo provisioning. No official content, old account or historical pin is updated. */
public final class LocalDemoProvisioning implements ApplicationRunner {
    public record Projection(UUID organization,UUID bank,UUID model,UUID mapping,UUID parameters,String hash,
            Map<UUID,UUID> itemIds,Map<UUID,String> originalHashes,Map<UUID,String> projectedHashes){
        public Projection { itemIds=Map.copyOf(itemIds);originalHashes=Map.copyOf(originalHashes);projectedHashes=Map.copyOf(projectedHashes); }
    }
    private record Key(UUID org,UUID bank,UUID model,UUID mapping,UUID set,UUID admin,String hash,String mappingHash,
            String modelJson,String mappingJson,String artifact){}
    private final Projection projection;
    private final DevelopmentSeedRepositories seeds;
    private final ObjectMapper json;
    private final TransactionTemplate transaction;
    private final boolean seedPersonaAccounts;
    private final UUID technicalActor;
    public LocalDemoProvisioning(DevelopmentSeedRepositories seeds,ObjectMapper json,org.springframework.transaction.PlatformTransactionManager transactions) {
        this(seeds,json,transactions,true,LocalDemoIdentity.id("admin"));
    }
    public LocalDemoProvisioning(DevelopmentSeedRepositories seeds,ObjectMapper json,org.springframework.transaction.PlatformTransactionManager transactions,
            boolean seedPersonaAccounts,UUID technicalActor) {
        this(seeds,json,transactions,seedPersonaAccounts,technicalActor,null);
    }
    public LocalDemoProvisioning(DevelopmentSeedRepositories seeds,ObjectMapper json,org.springframework.transaction.PlatformTransactionManager transactions,
            boolean seedPersonaAccounts,UUID technicalActor,Projection projection) {
        this.seeds=seeds; this.json=json; this.transaction=new TransactionTemplate(transactions);
        this.seedPersonaAccounts=seedPersonaAccounts;this.technicalActor=Objects.requireNonNull(technicalActor);
        this.projection=projection;
        if(projection!=null && seedPersonaAccounts)throw new IllegalArgumentException("Projected seed does not create demo personas");
    }
    public void run(ApplicationArguments arguments) throws Exception {
        byte[] bytes=new ClassPathResource("demo/synthetic-fitted-v1.json").getInputStream().readAllBytes();
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        if (!hash.equals("089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e")) throw new IllegalStateException("Demo fitted artifact drift");
        JsonNode fitted=json.readTree(bytes).path("result");
        String model=json.writeValueAsString(AdaptiveIrtPolicy.referenceModelV1());
        String mapping=json.writeValueAsString(AdaptiveIrtPolicy.referenceMappingV1());
        String effectiveHash=projection==null?hash:sha256(hash+":"+projection.hash());
        transaction.executeWithoutResult(status -> provision(fitted,effectiveHash,model,mapping));
    }
    private static String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private void provision(JsonNode fitted,String hash,String model,String mapping) {
        seeds.locks().lock("LOCAL_BASELINE_DEMO_V1");
        var identities=seeds.identities();var technical=seeds.technical();
        UUID org=projection==null?LocalDemoIdentity.ORG:projection.organization(),bank=projection==null?LocalDemoIdentity.BANK:projection.bank();
        if (!technical.bankOwnedBy(bank,org)) throw new IllegalStateException("Provision official bank first");
        var pins=technical.itemPins(bank);
        var expected=new HashMap<UUID,String>(); fitted.path("items").forEach(i->expected.put(UUID.fromString(i.path("pin").path("itemVersionId").asText()),i.path("pin").path("contentHash").asText()));
        if(projection!=null){
            if(!expected.equals(projection.originalHashes()))throw new IllegalStateException("Source fitted/content projection drift");
            expected.clear();expected.putAll(projection.projectedHashes());
        }
        if (pins.size()!=135 || expected.size()!=135 || pins.stream().anyMatch(i->!i.contentHash().equals(expected.get(i.itemVersionId())))) throw new IllegalStateException("Official bank pins drift");
        for (String persona:seedPersonaAccounts?LocalDemoIdentity.PERSONAS:Set.<String>of()) {
            String role=persona.equals("ld")?"LD_MANAGER":persona.equals("admin")?"ADMINISTRATOR":"EMPLOYEE";
            UUID id=LocalDemoIdentity.id(persona);String name="local-baseline-demo-"+persona;
            identities.insertAccountIfAbsent(id,LocalDemoIdentity.ORG,name,name,"DEMO_NO_PASSWORD_LOGIN");
            if (!identities.fixtureAccountExists(id,LocalDemoIdentity.ORG,name,"DEMO_NO_PASSWORD_LOGIN")) throw new IllegalStateException("Demo actor identity drift");
            identities.insertAccountRoleIfAbsent(id,role);
            if (role.equals("EMPLOYEE")) identities.insertLearnerStateIfAbsent(id);
        }
        var key=new Key(org,bank,projection==null?LocalDemoIdentity.id("model-v1"):projection.model(),projection==null?LocalDemoIdentity.id("mapping-v1"):projection.mapping(),
                projection==null?LocalDemoIdentity.id("fitted-v1"):projection.parameters(),technicalActor,hash,sha256(mapping),model,mapping,
                projection==null?"local-demo:SYNTHETIC:fixed-c-MML-EM-v1":"development:TechNova:Security:SYNTHETIC:"+projection.hash());
        technical.insertModelIfAbsent(key.model(),"LOCAL_DEMO_SYNTHETIC_V1",key.hash(),key.modelJson(),key.artifact());
        technical.insertMappingIfAbsent(key.mapping(),key.mappingJson(),key.mappingHash());
        if (!technical.unapprovedModelMatches(key.model(),key.modelJson(),key.hash(),key.artifact())
                || !technical.mappingMatches(key.mapping(),key.mappingJson(),key.mappingHash())) throw new IllegalStateException("Demo policy drift");
        var sets=technical.setState(key.set());
        if (sets.isEmpty()) {
            technical.insert(new IrtParameterSetEntity(key.set(),key.model(),"SEEDED","BUILDING",key.hash(),null,null,null));
            var parameters=new ArrayList<IrtItemParameterEntity>();
            for (var item:fitted.path("items")) {
                parameters.add(new IrtItemParameterEntity(key.set(),projectedItem(UUID.fromString(item.path("pin").path("itemVersionId").asText())),
                        item.path("pin").path("skillId").asText(),item.path("a").decimalValue(),item.path("b").decimalValue(),item.path("c").decimalValue(),diagnostics(item)));
            }
            seeds.itemParameters().insertAll(parameters);
            technical.markCandidate(key.set());
            technical.promote(key.set(),key.admin());
        } else if (!hash.equals(sets.getFirst().parameterHash()) || !"SEEDED".equals(sets.getFirst().source()) || !"PROMOTED".equals(sets.getFirst().status())) throw new IllegalStateException("Demo parameter pin drift");
        long count=technical.parameterCount(key.set());
        if (count!=135) throw new IllegalStateException("Demo parameter coverage drift");
        if(projection!=null)verifyProjectedParameters(fitted,key);
    }
    private UUID projectedItem(UUID original){
        if(projection==null)return original;
        var id=projection.itemIds().get(original);if(id==null)throw new IllegalStateException("Seed item projection missing");return id;
    }
    private String diagnostics(JsonNode item){
        if(projection==null)return "{\"origin\":\"SYNTHETIC\",\"operationalPromotionEligible\":false,\"cEstimated\":false}";
        try{return json.writeValueAsString(Map.of("origin","SYNTHETIC","operationalPromotionEligible",false,"cEstimated",false,
                "seedProjectionHash",projection.hash(),"sourceItemVersionId",item.path("pin").path("itemVersionId").asText(),"sourceContentHash",item.path("pin").path("contentHash").asText()));}
        catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
    }
    private void verifyProjectedParameters(JsonNode fitted,Key key){
        var expected=new HashMap<UUID,JsonNode>();fitted.path("items").forEach(item->expected.put(projectedItem(UUID.fromString(item.path("pin").path("itemVersionId").asText())),item));
        for(var row:seeds.technical().parameters(key.set())){
            var item=expected.remove(row.itemVersionId());
            if(item==null || !item.path("pin").path("skillId").asText().equals(row.microSkillId())
                    || item.path("a").decimalValue().compareTo(row.discriminationA())!=0
                    || item.path("b").decimalValue().compareTo(row.difficultyB())!=0
                    || item.path("c").decimalValue().compareTo(row.guessingC())!=0)
                throw new IllegalStateException("Projected fitted parameter drift");
        }
        if(!expected.isEmpty())throw new IllegalStateException("Projected fitted coverage drift");
    }
}