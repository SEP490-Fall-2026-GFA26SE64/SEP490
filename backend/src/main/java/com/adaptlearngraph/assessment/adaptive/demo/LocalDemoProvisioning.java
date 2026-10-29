package com.adaptlearngraph.assessment.adaptive.demo;

import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy;
import com.fasterxml.jackson.databind.*;
import javax.sql.DataSource;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.boot.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Idempotent explicit demo provisioning. No official content, old account or historical pin is updated. */
public final class LocalDemoProvisioning implements ApplicationRunner {
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate transaction;
    private final boolean seedPersonaAccounts;
    private final UUID technicalActor;
    public LocalDemoProvisioning(DataSource source,ObjectMapper json) {
        this(source,json,true,LocalDemoIdentity.id("admin"));
    }
    public LocalDemoProvisioning(DataSource source,ObjectMapper json,boolean seedPersonaAccounts,UUID technicalActor) {
        this.jdbc=new NamedParameterJdbcTemplate(source); this.json=json; this.transaction=new TransactionTemplate(new JdbcTransactionManager(source));
        this.seedPersonaAccounts=seedPersonaAccounts;this.technicalActor=Objects.requireNonNull(technicalActor);
    }
    public void run(ApplicationArguments arguments) throws Exception {
        byte[] bytes=new ClassPathResource("demo/synthetic-fitted-v1.json").getInputStream().readAllBytes();
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        if (!hash.equals("089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e")) throw new IllegalStateException("Demo fitted artifact drift");
        JsonNode fitted=json.readTree(bytes).path("result");
        String model=json.writeValueAsString(AdaptiveIrtPolicy.referenceModelV1());
        String mapping=json.writeValueAsString(AdaptiveIrtPolicy.referenceMappingV1());
        transaction.executeWithoutResult(status -> provision(fitted,hash,model,mapping));
    }
    private static String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private void provision(JsonNode fitted,String hash,String model,String mapping) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended('LOCAL_BASELINE_DEMO_V1',0))",Map.of(),(rs,row)->true);
        var base=new MapSqlParameterSource("org",LocalDemoIdentity.ORG).addValue("bank",LocalDemoIdentity.BANK);
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by WHERE b.question_bank_id=:bank AND a.organization_id=:org)",base,Boolean.class))) throw new IllegalStateException("Provision official bank first");
        var pins=jdbc.query("SELECT item_version_id,content_hash FROM platform.item_version WHERE question_bank_id=:bank",base,(rs,row)->Map.entry(rs.getObject(1,UUID.class),rs.getString(2)));
        var expected=new HashMap<UUID,String>(); fitted.path("items").forEach(i->expected.put(UUID.fromString(i.path("pin").path("itemVersionId").asText()),i.path("pin").path("contentHash").asText()));
        if (pins.size()!=135 || expected.size()!=135 || pins.stream().anyMatch(i->!i.getValue().equals(expected.get(i.getKey())))) throw new IllegalStateException("Official bank pins drift");
        for (String persona:seedPersonaAccounts?LocalDemoIdentity.PERSONAS:Set.<String>of()) {
            String role=persona.equals("ld")?"LD_MANAGER":persona.equals("admin")?"ADMINISTRATOR":persona.startsWith("expert-")?"DOMAIN_EXPERT":"EMPLOYEE";
            var a=new MapSqlParameterSource("id",LocalDemoIdentity.id(persona)).addValue("org",LocalDemoIdentity.ORG).addValue("name", "local-baseline-demo-"+persona).addValue("role",role);
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES(:id,:org,:name,:name,'DEMO_NO_PASSWORD_LOGIN') ON CONFLICT(account_id) DO NOTHING",a);
            if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.account WHERE account_id=:id AND organization_id=:org AND identifier=:name AND active AND password_hash='DEMO_NO_PASSWORD_LOGIN')",a,Boolean.class))) throw new IllegalStateException("Demo actor identity drift");
            jdbc.update("INSERT INTO platform.account_role(account_id,role_code) VALUES(:id,:role) ON CONFLICT DO NOTHING",a);
            if (role.equals("EMPLOYEE")) jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES(:id) ON CONFLICT DO NOTHING",a);
        }
        var key=base.addValue("model",LocalDemoIdentity.id("model-v1")).addValue("mapping",LocalDemoIdentity.id("mapping-v1")).addValue("set",LocalDemoIdentity.id("fitted-v1")).addValue("admin",technicalActor).addValue("hash",hash).addValue("mappingHash",sha256(mapping)).addValue("modelJson",model).addValue("mappingJson",mapping);
        jdbc.update("INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref) VALUES(:model,'IRT_3PL','LOCAL_DEMO_SYNTHETIC_V1',:hash,CAST(:modelJson AS jsonb),'local-demo:SYNTHETIC:fixed-c-MML-EM-v1') ON CONFLICT(model_version_id) DO NOTHING",key);
        jdbc.update("INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash) VALUES(:mapping,'LOGISTIC_CONSERVATIVE_V1',CAST(:mappingJson AS jsonb),:mappingHash) ON CONFLICT DO NOTHING",key);
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.model_version WHERE model_version_id=:model AND configuration=CAST(:modelJson AS jsonb) AND parameter_hash=:hash AND approved_by IS NULL AND artifact_ref='local-demo:SYNTHETIC:fixed-c-MML-EM-v1')",key,Boolean.class)) || !Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.mastery_mapping_version WHERE mastery_mapping_version_id=:mapping AND configuration=CAST(:mappingJson AS jsonb) AND configuration_hash=:mappingHash)",key,Boolean.class))) throw new IllegalStateException("Demo policy drift");
        var sets=jdbc.queryForList("SELECT parameter_hash,source,status FROM platform.irt_parameter_set WHERE parameter_set_id=:set",key);
        if (sets.isEmpty()) {
            jdbc.update("INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash) VALUES(:set,:model,'SEEDED','BUILDING',:hash)",key);
            for (var item:fitted.path("items")) {
                jdbc.update("INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c,fit_diagnostics) VALUES(:set,:item,:skill,:a,:b,:c,CAST(:diagnostics AS jsonb))",new MapSqlParameterSource(key.getValues()).addValue("item",UUID.fromString(item.path("pin").path("itemVersionId").asText())).addValue("skill",item.path("pin").path("skillId").asText()).addValue("a",item.path("a").decimalValue()).addValue("b",item.path("b").decimalValue()).addValue("c",item.path("c").decimalValue()).addValue("diagnostics","{\"origin\":\"SYNTHETIC\",\"operationalPromotionEligible\":false,\"cEstimated\":false}"));
            }
            jdbc.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=:set",key);
            jdbc.update("UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=:admin,activated_at=clock_timestamp() WHERE parameter_set_id=:set",key);
        } else if (!hash.equals(sets.getFirst().get("parameter_hash")) || !"SEEDED".equals(sets.getFirst().get("source")) || !"PROMOTED".equals(sets.getFirst().get("status"))) throw new IllegalStateException("Demo parameter pin drift");
        Integer count=jdbc.queryForObject("SELECT count(*) FROM platform.irt_item_parameter WHERE parameter_set_id=:set",key,Integer.class);
        if (count==null || count!=135) throw new IllegalStateException("Demo parameter coverage drift");
    }
}
