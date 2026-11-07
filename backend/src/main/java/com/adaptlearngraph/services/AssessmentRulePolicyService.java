package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** Two independent tenant policies; shares the rule executor, never an activation pointer. */
public final class AssessmentRulePolicyService {
    public record Version(UUID id,Purpose purpose,long version,Policy configuration,String hash,UUID createdBy,Instant createdAt) {}
    public record State(Purpose purpose,Version active,long activationRevision) {}
    public record Save(UUID commandKey,Policy configuration) {}
    public record Activate(UUID commandKey,UUID versionId,long expectedRevision) {}
    private final AdaptiveBlueprintActorPort actors;
    private final AssessmentRulePolicyJpaRepository policies;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    public AssessmentRulePolicyService(AdaptiveBlueprintActorPort actors,AssessmentRulePolicyJpaRepository policies,
            PostgresAdvisoryLocks locks,TransactionTemplate tx,ObjectMapper json) {
        this.actors=actors;this.policies=policies;this.locks=locks;this.tx=tx;this.json=json;
    }
    private AdaptiveBlueprintActorPort.Actor actor() {
        var a=actors.currentActor().orElseThrow(()->new Failure(401,"UNAUTHENTICATED"));
        if(!a.isActiveLdManager())throw new Failure(403,"FORBIDDEN");return a;
    }
    /** Preserve trusted authorization before the HTTP adapter parses a mutation body. */
    public void authorize() { actor(); }
    private <T>T locked(AdaptiveBlueprintActorPort.Actor a,Purpose purpose,Supplier<T> work) {
        Objects.requireNonNull(purpose);
        return tx.execute(status->{
            locks.lock("ASSESSMENT-RULE-POLICY\n"+a.organizationId()+"\n"+purpose);
            if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");
            T result=work.get();if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");return result;
        });
    }
    public State read(Purpose purpose) {
        var a=actor();return locked(a,purpose,()->state(a.organizationId(),purpose));
    }
    public List<Version> versions(Purpose purpose,int page,int size) {
        var a=actor();if(page<0 || size<1 || size>100)throw new Failure(400,"INVALID_REQUEST");
        return policies.versions(a.organizationId(),purpose.name(),PageRequest.of(page,size)).stream().map(this::version).toList();
    }
    public Version save(Purpose purpose,Save command) {
        var a=actor();if(command==null || command.commandKey()==null || command.configuration()==null)throw new Failure(400,"INVALID_REQUEST");
        String body=write(command.configuration());String hash=policyHash(AssessmentRulePolicyEntity.HASH_DOMAIN,purpose,body);
        return locked(a,purpose,()->{
            var retained=policies.receipt(a.organizationId(),a.accountId(),"SAVE_RULE_POLICY",purpose.name(),command.commandKey());
            if(retained.isPresent()) {
                var prior=read(retained.get().getOutcome(),Version.class);
                var stored=policies.owned(a.organizationId(),purpose.name(),prior.id())
                        .orElseThrow(()->new Failure(503,"POLICY_INTEGRITY_FAILURE"));
                return replay(retained.get(),policyHash(stored.getHashDomain(),purpose,body),Version.class);
            }
            var row=new AssessmentRulePolicyEntity(UUID.randomUUID(),a.organizationId(),purpose.name(),
                    policies.maxVersion(a.organizationId(),purpose.name())+1,body,hash,a.accountId(),Instant.now());
            policies.insert(row);var result=version(row);
            retain(a,purpose,"SAVE_RULE_POLICY",command.commandKey(),hash,result);return result;
        });
    }
    public State activate(Purpose purpose,Activate command) {
        var a=actor();if(command==null || command.commandKey()==null || command.versionId()==null || command.expectedRevision()<0)
            throw new Failure(400,"INVALID_REQUEST");
        String hash=digest("ACTIVATE_RULE_POLICY\n"+purpose+"\n"+command.versionId()+"\n"+command.expectedRevision());
        return locked(a,purpose,()->{
            var retained=policies.receipt(a.organizationId(),a.accountId(),"ACTIVATE_RULE_POLICY",purpose.name(),command.commandKey());
            if(retained.isPresent())return replay(retained.get(),hash,State.class);
            var version=policies.owned(a.organizationId(),purpose.name(),command.versionId()).orElseThrow(()->new Failure(404,"POLICY_NOT_FOUND"));
            if(version.getScopeKey()!=null)throw new Failure(404,"POLICY_NOT_FOUND");
            version(version); // Validate the frozen rule JSON/hash before activation.
            var current=state(a.organizationId(),purpose);
            if(current.activationRevision()!=command.expectedRevision())throw new Failure(409,"STALE_POLICY_ACTIVATION");
            if(current.active()==null || !current.active().id().equals(version.getId())) {
                if(policies.activate(a.organizationId(),purpose.name(),version.getId(),a.accountId(),command.expectedRevision())!=1)
                    throw new Failure(409,"STALE_POLICY_ACTIVATION");
            }
            var result=state(a.organizationId(),purpose);retain(a,purpose,"ACTIVATE_RULE_POLICY",command.commandKey(),hash,result);return result;
        });
    }
    private State state(UUID org,Purpose purpose) {
        return new State(purpose,policies.active(org,purpose.name()).map(this::version).orElse(null),
                policies.activationRevision(org,purpose.name()).orElse(0L));
    }
    private Version version(AssessmentRulePolicyEntity row) {
        Policy configuration=read(row.getConfiguration(),Policy.class);var purpose=Purpose.valueOf(row.getPurpose());
        if(!policyHash(row.getHashDomain(),purpose,write(configuration)).equals(row.getConfigurationHash()))
            throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
        return new Version(row.getId(),purpose,row.getVersion(),configuration,row.getConfigurationHash(),row.getCreatedBy(),row.getCreatedAt());
    }
    private void retain(AdaptiveBlueprintActorPort.Actor a,Purpose purpose,String operation,UUID key,String hash,Object outcome) {
        policies.retain(UUID.randomUUID(),a.organizationId(),a.accountId(),operation,purpose.name(),key,hash,write(outcome));
    }
    private <T>T replay(AssessmentRulePolicyJpaRepository.Receipt receipt,String hash,Class<T> type) {
        if(!receipt.getHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return read(receipt.getOutcome(),type);
    }
    private String write(Object value) {try{return json.writeValueAsString(value);}catch(Exception invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}}
    private <T>T read(String value,Class<T> type) {try{return json.readValue(value,type);}catch(Exception invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}}
    private static String digest(String value){return RoleBaselineFlow.hash(value);}
    private static String policyHash(String domain,Purpose purpose,String configuration){return digest(domain+"\n"+purpose+"\n"+configuration);}
}
