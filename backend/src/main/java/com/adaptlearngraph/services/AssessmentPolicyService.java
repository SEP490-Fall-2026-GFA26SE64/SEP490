package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.AssessmentPolicyStore;
import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.entities.OrganizationAssessmentPolicy;
import com.adaptlearngraph.entities.OrganizationAssessmentPolicy.*;
import java.util.UUID;

/** Own-organization configuration independent of Occupation/resource readiness. */
public final class AssessmentPolicyService implements AssessmentPolicyUseCase {
    public static final class Failure extends RuntimeException {
        public final int status;public final String code;
        public Failure(int status,String code){super(code);this.status=status;this.code=code;}
    }
    public interface Encoding { String write(Object value);<T>T read(String json,Class<T> type); }
    private final AdaptiveBlueprintActorPort actors;
    private final AssessmentPolicyStore store;
    private final Encoding json;
    public AssessmentPolicyService(AdaptiveBlueprintActorPort actors,AssessmentPolicyStore store,Encoding json){this.actors=actors;this.store=store;this.json=json;}
    private AdaptiveBlueprintActorPort.Actor actor(){
        var a=actors.currentActor().orElseThrow(()->new Failure(401,"UNAUTHENTICATED"));
        if(!a.isActiveLdManager())throw new Failure(403,"FORBIDDEN");return a;
    }
    public void authorize(){actor();}
    public State read(){return store.read(actor().organizationId());}
    public Page list(int page,int size){var a=actor();if(page<0 || size<1 || size>100)throw new Failure(400,"INVALID_REQUEST");return store.list(a.organizationId(),page,size);}
    public Saved save(UUID key,Values values){
        var a=actor();validateKey(key);if(values==null)throw new Failure(400,"INVALID_REQUEST");
        String hash=OrganizationAssessmentPolicy.digest("SAVE_VERSION\n"+values.hash());
        return store.locked(a.organizationId(),()->{
            if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");
            var replay=store.receipt(a.organizationId(),a.accountId(),key,hash);
            if(replay.isPresent()){
                var saved=stored(replay.get(),Saved.class);
                if(!a.organizationId().equals(saved.version().pin().organizationId()) || !values.hash().equals(saved.version().pin().hash()))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
                return saved;
            }
            var result=store.save(a.organizationId(),a.accountId(),values);
            store.receipt(a.organizationId(),a.accountId(),key,"SAVE_VERSION",hash,result);
            if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");return result;
        });
    }
    public State activate(UUID key,UUID version,long revision){
        var a=actor();validateKey(key);validateKey(version);if(revision<0)throw new Failure(400,"INVALID_REQUEST");
        String hash=OrganizationAssessmentPolicy.digest("ACTIVATE\n"+version+"\n"+revision);
        return store.locked(a.organizationId(),()->{
            if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");
            var replay=store.receipt(a.organizationId(),a.accountId(),key,hash);
            if(replay.isPresent()){
                var state=stored(replay.get(),State.class);
                if(state.active()==null || !a.organizationId().equals(state.active().pin().organizationId()) || !version.equals(state.active().pin().versionId()))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
                return state;
            }
            var result=store.activate(a.organizationId(),a.accountId(),key,version,revision);
            store.receipt(a.organizationId(),a.accountId(),key,"ACTIVATE",hash,result);
            if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");return result;
        });
    }
    private void validateKey(UUID key){try{OrganizationAssessmentPolicy.id(key);}catch(IllegalArgumentException invalid){throw new Failure(400,"INVALID_REQUEST");}}
    private <T>T stored(String value,Class<T> type){try{return json.read(value,type);}catch(RuntimeException invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}}
}
