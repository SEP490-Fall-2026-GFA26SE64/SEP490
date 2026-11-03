package com.adaptlearngraph.config;

import com.adaptlearngraph.dtos.OfficialQuestionBankManifest;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** Explicit fresh-main development projection. Never a generic tenant resolver or live bank transfer. */
public final class MainDevelopmentBankSeed {
    private static final Map<String,String> HASHES=new java.util.concurrent.ConcurrentHashMap<>();
    public static final UUID ORGANIZATION=UUID.fromString("e0000000-0000-0000-0000-000000000001");
    private MainDevelopmentBankSeed(){}
    public static UUID id(String name){return UUID.nameUUIDFromBytes(("workspace-seed:v2:"+ORGANIZATION+":"+name).getBytes(StandardCharsets.UTF_8));}
    public static UUID projected(String kind,UUID original){return id(kind+":"+original);}
    public static UUID seId(String name){return switch(name){
        case "bank"->projected("bank",SoftwareDevelopmentSeed.id("bank"));
        case "model","mapping","parameters"->id("se:"+name);
        default->id("se:"+name);
    };}
    public static UUID securityId(String name){return id("security:"+name);}
    public static UUID securityBank(){return projected("bank",LocalDemoIdentity.BANK);}
    public static boolean catalog(UUID org,String occupation){return ORGANIZATION.equals(org) && Set.of(LocalDemoIdentity.OCC,SoftwareDevelopmentSeed.OCCUPATION).contains(occupation);}
    public static boolean sourceCatalog(Set<String> occupations){return Set.of("OCC-15-1252.00","OCC-15-1243.00","OCC-15-1253.00","OCC-15-1299.08","OCC-15-1212.00").containsAll(occupations);}
    public static UUID bank(String occupation){return LocalDemoIdentity.OCC.equals(occupation)?securityBank():SoftwareDevelopmentSeed.OCCUPATION.equals(occupation)?seId("bank"):null;}
    /** Internal provenance for the exact main seed; not an API/public item projection. */
    public static com.fasterxml.jackson.databind.JsonNode projectedManifest(String occupation) {
        if(!catalog(ORGANIZATION,occupation))throw new IllegalArgumentException("Unsupported development bank scope");
        try {
            var source=LocalDemoIdentity.OCC.equals(occupation)?securitySource():parse(SoftwareDevelopmentSeed.bankBytes(),OfficialQuestionBankManifest.class);
            return JSON.valueToTree(project(source));
        }catch(java.io.IOException invalid){throw new IllegalStateException("Development bank source unavailable",invalid);}
    }
    static OfficialQuestionBankManifest project(OfficialQuestionBankManifest source){
        UUID bank=projected("bank",source.questionBank().id());var items=new ArrayList<Item>();var versions=new HashSet<UUID>();var identities=new HashSet<UUID>();
        for(var item:source.items()){
            require(hash(content(source.questionBank().id(),item)).equals(item.contentHash()),"Original seed item drift");
            UUID version=projected("item-version",item.itemVersionId()),identity=projected("item",item.itemId());
            require(versions.add(version) && identities.add(identity),"Projected seed identity collision");
            var projected=new Item(version,identity,item.version(),item.microSkillId(),item.microSkillName(),item.difficulty(),item.prompt(),item.responseSchema(),item.protectedKey(),item.publicationState(),"");
            items.add(new Item(version,identity,item.version(),item.microSkillId(),item.microSkillName(),item.difficulty(),item.prompt(),item.responseSchema(),item.protectedKey(),item.publicationState(),hash(content(bank,projected))));
        }
        return new OfficialQuestionBankManifest(source.formatVersion(),source.manifestVersion()+"-technova-seed-v2",source.catalogVersion(),source.sourceSha256(),source.scopeSha256(),source.occupationId(),new Bank(bank,source.questionBank().name()),List.copyOf(items));
    }
    static OfficialQuestionBankManifest securitySource(){
        try(var in=MainDevelopmentBankSeed.class.getResourceAsStream("/db/seed/question-bank-15-1212.00-v1-ontology-v09.json")){
            if(in==null)throw new IllegalStateException("Security source missing");byte[] bytes=in.readAllBytes();
            require(sha256(bytes).equals("ca4fb71cc4a167e9d37d7133d9fe62a0cf8e9400ca9a5faeb22b4264a51b0bb6"),"Security source drift");
            return parse(bytes,OfficialQuestionBankManifest.class);
        }catch(java.io.IOException invalid){throw new IllegalStateException("Security source unavailable",invalid);}
    }
    public static String projectionHash(String occupation){return HASHES.computeIfAbsent(occupation,MainDevelopmentBankSeed::calculateProjectionHash);}
    private static String calculateProjectionHash(String occupation){
        try{
            var source=LocalDemoIdentity.OCC.equals(occupation)?securitySource():parse(SoftwareDevelopmentSeed.bankBytes(),OfficialQuestionBankManifest.class);
            require(catalog(ORGANIZATION,occupation) && occupation.equals(source.occupationId()),"Unsupported seed scope");
            return hash(JSON.valueToTree(Map.of("namespace","workspace-seed:v2","organization",ORGANIZATION,"source",source,"projected",project(source))));
        }catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
    }
    public static java.util.List<com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort.ItemParameter> parameters(String occupation){
        var result=new ArrayList<com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort.ItemParameter>();
        try{
            if(LocalDemoIdentity.OCC.equals(occupation)){
                try(var in=MainDevelopmentBankSeed.class.getResourceAsStream("/demo/synthetic-fitted-v1.json")){
                    if(in==null)throw new IllegalStateException("Fitted source missing");var bytes=in.readAllBytes();
                    require(sha256(bytes).equals("089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e"),"Fitted source drift");
                    for(var item:JSON.readTree(bytes).path("result").path("items"))result.add(new com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort.ItemParameter(
                            projected("item-version",UUID.fromString(item.path("pin").path("itemVersionId").asText())),item.path("pin").path("skillId").asText(),
                            item.path("a").decimalValue(),item.path("b").decimalValue(),item.path("c").decimalValue()));
                }
            }else if(SoftwareDevelopmentSeed.OCCUPATION.equals(occupation)){
                for(var item:project(parse(SoftwareDevelopmentSeed.bankBytes(),OfficialQuestionBankManifest.class)).items()){
                    int b=switch(item.difficulty()){case "EASY"->-1;case "MEDIUM"->0;default->1;};
                    result.add(new com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort.ItemParameter(item.itemVersionId(),item.microSkillId(),new java.math.BigDecimal("1.5"),java.math.BigDecimal.valueOf(b),new java.math.BigDecimal("0.25")));
                }
            }else throw new IllegalArgumentException("Unsupported development bank");
        }catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
        return List.copyOf(result);
    }
    public static com.adaptlearngraph.entities.domain.Calibration.Bank calibrationBank(
            com.adaptlearngraph.repository.CalibrationPorts.Grant grant,
            com.adaptlearngraph.entities.domain.Calibration.Source expected){
        if(!ORGANIZATION.equals(grant.scope().organizationId()))throw new com.adaptlearngraph.entities.domain.Calibration.Failure(
                com.adaptlearngraph.entities.domain.Calibration.Code.FORBIDDEN);
        String occupation=List.of(LocalDemoIdentity.OCC,SoftwareDevelopmentSeed.OCCUPATION).stream()
                .filter(o->bank(o).equals(grant.scope().bankId())).findFirst().orElseThrow(()->new com.adaptlearngraph.entities.domain.Calibration.Failure(
                        com.adaptlearngraph.entities.domain.Calibration.Code.NOT_READY));
        try{
            var original=LocalDemoIdentity.OCC.equals(occupation)?securitySource():parse(SoftwareDevelopmentSeed.bankBytes(),OfficialQuestionBankManifest.class);
            var projected=project(original);
            var source=new com.adaptlearngraph.entities.domain.Calibration.Source(projected.questionBank().id(),projected.manifestVersion(),
                    hash(JSON.valueToTree(projected)),projected.scopeSha256(),projected.sourceSha256());
            if(!source.equals(expected))throw new IllegalStateException("Development calibration source drift");
            var items=projected.items().stream().map(i->new com.adaptlearngraph.entities.domain.Calibration.Item(
                    new com.adaptlearngraph.entities.domain.Calibration.ItemPin(i.itemVersionId(),i.itemId(),i.version(),i.microSkillId(),i.contentHash()),
                    java.util.stream.StreamSupport.stream(i.responseSchema().path("options").spliterator(),false).map(o->o.path("id").asText()).toList(),i.protectedKey().path("correctOptionId").asText()))
                    .sorted(java.util.Comparator.comparing((com.adaptlearngraph.entities.domain.Calibration.Item i)->i.pin().skillId()).thenComparing(i->i.pin().itemVersionId().toString())).toList();
            return new com.adaptlearngraph.entities.domain.Calibration.Bank(source,items);
        }catch(java.io.IOException invalid){throw new IllegalStateException(invalid);}
    }
    public static String seTechnicalHash(){return sha256((SoftwareDevelopmentSeed.technicalHash()+":"+projectionHash(SoftwareDevelopmentSeed.OCCUPATION)).getBytes(StandardCharsets.UTF_8));}
    public static String securityTechnicalHash(){return sha256(("089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e:"+projectionHash(LocalDemoIdentity.OCC)).getBytes(StandardCharsets.UTF_8));}
    public static LocalDemoProvisioning.Projection securityProjection(){
        var source=securitySource();var result=project(source);var ids=new HashMap<UUID,UUID>();var original=new HashMap<UUID,String>();var projected=new HashMap<UUID,String>();
        for(int i=0;i<source.items().size();i++){
            var from=source.items().get(i);var to=result.items().get(i);ids.put(from.itemVersionId(),to.itemVersionId());original.put(from.itemVersionId(),from.contentHash());projected.put(to.itemVersionId(),to.contentHash());
        }
        return new LocalDemoProvisioning.Projection(ORGANIZATION,securityBank(),securityId("model-v1"),securityId("mapping-v1"),securityId("fitted-v1"),projectionHash(LocalDemoIdentity.OCC),ids,original,projected);
    }
    static void prepareOwner(com.adaptlearngraph.repository.DevelopmentSeedJpaRepository seeds){
        UUID actor=id("bank-owner");
        seeds.insertOrganizationIgnoringConflicts(ORGANIZATION,"TECHNOVA","TechNova Cognitive Labs");
        require(seeds.activeOrganizationExists(ORGANIZATION,"TECHNOVA"),"TechNova owner tenant drift");
        seeds.insertAccountIgnoringConflicts(actor,ORGANIZATION,"technova-bank-seed-owner.invalid","technova-bank-seed-owner.invalid","DEVELOPMENT_NO_LOGIN");
        require(seeds.fixtureAccountExists(actor,ORGANIZATION,"technova-bank-seed-owner.invalid","DEVELOPMENT_NO_LOGIN"),"TechNova seed creator drift");
    }
    static void requireFreshOrProjected(com.adaptlearngraph.repository.TechnicalVersionSeedJpaRepository technical){
        if(technical.anyQuestionBank(List.of(LocalDemoIdentity.BANK,SoftwareDevelopmentSeed.id("bank"))))
            throw new IllegalStateException("Fresh main seed refuses legacy-bank ownership drift; existing banks/data are retained");
    }
}