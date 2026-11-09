package com.adaptlearngraph.entities.domain;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** Immutable requirement revision values; graph catalog and original lesson progress remain with their owners. */
public final class RequirementPathway {
    private RequirementPathway() {}
    public enum Provision { MODULE_ONLY, CERTIFICATE_ONLY, UNCONFIGURED }
    public enum Kind { REQUIRED, PARALLEL_SUPPLEMENT }
    public enum State { NEEDS_SUPPLEMENTATION, NEEDS_EXPERT_ACTION, IN_PROGRESS, FULFILLED, BYPASSED }
    public record Requirement(String skillId,String skillName,KnowledgeLevel knowledgeLevel,String skillVersion,List<String> outcomeCodes,Provision provision) {
        public Requirement {
            text(skillId);text(skillName);Objects.requireNonNull(knowledgeLevel);Objects.requireNonNull(provision);
            if(provision!=Provision.UNCONFIGURED)text(skillVersion);
            var codes=outcomeCodes==null?List.<String>of():outcomeCodes;
            outcomeCodes=List.copyOf(codes);
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
        public String proofKey(){return InitialIdentity.hash("exact-knowledge-proof",Arrays.asList(skillId,knowledgeLevel,skillVersion));}
    }
    public record Option(String moduleId,int moduleRevision,String contentVersion,String title,List<String> outcomeCodes,String skillVersion) {
        public Option {
            text(moduleId);text(contentVersion);text(title);text(skillVersion);if(moduleRevision<1)throw new IllegalArgumentException("Module revision required");
            outcomeCodes=outcomeCodes==null?List.of():List.copyOf(outcomeCodes);
        }
        public String key(){return moduleId+"\n"+contentVersion;}
        public boolean matches(Requirement requirement){return skillVersion.equals(requirement.skillVersion());}
    }
    public record AssessedSource(UUID attemptId,UUID groupId,UUID dependentStepId,UUID requestId) {
        public AssessedSource(UUID attemptId,UUID groupId,UUID dependentStepId){this(attemptId,groupId,dependentStepId,null);}
        public AssessedSource {Objects.requireNonNull(attemptId);Objects.requireNonNull(groupId);Objects.requireNonNull(dependentStepId);}
    }
    public record CertificateReference(String id,String version,String name,String referenceUrl) {
        public CertificateReference {text(id);text(version);text(name);referenceUrl=HttpsReference.require(referenceUrl);}
    }
    public record Step(UUID id,Requirement requirement,Kind kind,UUID sourceBypassId,State state,String reason,
            UUID fulfilledEvidenceId,List<Option> options,CertificateReference certificate,List<AssessedSource> assessedSources) {
        public Step(UUID id,Requirement requirement,Kind kind,UUID sourceBypassId,State state,String reason,
                UUID fulfilledEvidenceId,List<Option> options,CertificateReference certificate) {
            this(id,requirement,kind,sourceBypassId,state,reason,fulfilledEvidenceId,options,certificate,List.of());
        }
        public Step {
            Objects.requireNonNull(id);Objects.requireNonNull(requirement);Objects.requireNonNull(kind);Objects.requireNonNull(state);text(reason);options=List.copyOf(options);
            assessedSources=List.copyOf(assessedSources);
            if(assessedSources.size()>1000 || new HashSet<>(assessedSources).size()!=assessedSources.size())throw new IllegalArgumentException("Unique bounded assessed sources required");
            if((kind==Kind.PARALLEL_SUPPLEMENT)!=(sourceBypassId!=null) || (state==State.FULFILLED)!=(fulfilledEvidenceId!=null))
                throw new IllegalArgumentException("Invalid requirement provenance");
            if(options.size()>1000 || options.stream().map(Option::key).distinct().count()!=options.size()
                    || options.stream().anyMatch(option->!option.matches(requirement)))throw new IllegalArgumentException("Invalid equivalent module alternatives");
            if(requirement.provision()!=Provision.MODULE_ONLY && !options.isEmpty()
                    || requirement.provision()!=Provision.CERTIFICATE_ONLY && certificate!=null)
                throw new IllegalArgumentException("Module and certificate alternatives are exclusive");
            if(state!=State.FULFILLED && state!=State.BYPASSED && state!=State.NEEDS_EXPERT_ACTION
                    && (requirement.provision()==Provision.UNCONFIGURED || requirement.provision()==Provision.MODULE_ONLY && options.isEmpty()
                        || requirement.provision()==Provision.CERTIFICATE_ONLY && certificate==null))throw new IllegalArgumentException("Missing provision requires Expert action");
        }
        public String key(){return requirement.key()+"\n"+kind+"\n"+Objects.toString(sourceBypassId,"");}
        public boolean blocking(){return kind==Kind.REQUIRED && state!=State.FULFILLED && state!=State.BYPASSED;}
    }
    public record Dependency(UUID prerequisiteStepId,UUID dependentStepId,UUID attemptId,UUID groupId) {
        public Dependency {Objects.requireNonNull(prerequisiteStepId);Objects.requireNonNull(dependentStepId);Objects.requireNonNull(attemptId);Objects.requireNonNull(groupId);}
    }
    public record Plan(List<Step> steps,List<Dependency> dependencies) {
        public Plan {
            steps=List.copyOf(steps);dependencies=List.copyOf(dependencies);
            if(steps.size()>1000 || dependencies.size()>5000 || steps.stream().map(Step::key).distinct().count()!=steps.size()
                    || steps.stream().map(Step::id).distinct().count()!=steps.size())throw new IllegalArgumentException("Unique bounded requirements required");
            var byId=new HashMap<UUID,Step>();steps.forEach(step->byId.put(step.id(),step));var next=new HashMap<UUID,Set<UUID>>();
            for(var dependency:dependencies) {
                var prerequisite=byId.get(dependency.prerequisiteStepId());var dependent=byId.get(dependency.dependentStepId());
                if(prerequisite==null || dependent==null || prerequisite.id().equals(dependent.id())
                        || prerequisite.kind()==Kind.PARALLEL_SUPPLEMENT || dependent.kind()==Kind.PARALLEL_SUPPLEMENT)
                    throw new IllegalArgumentException("Parallel supplementation must not gate target requirements");
                if(!next.computeIfAbsent(prerequisite.id(),key->new HashSet<>()).add(dependent.id()))throw new IllegalArgumentException("Duplicate requirement dependency");
            }
            var visiting=new HashSet<UUID>();var visited=new HashSet<UUID>();
            for(var id:byId.keySet())acyclic(id,next,visiting,visited);
        }
        public boolean targetReleased(){return steps.stream().noneMatch(Step::blocking);}
        public boolean readyForInitialApproval(){return steps.stream().noneMatch(step->step.kind()==Kind.REQUIRED && step.state()==State.NEEDS_EXPERT_ACTION);}
    }
    private static void acyclic(UUID id,Map<UUID,Set<UUID>> next,Set<UUID> visiting,Set<UUID> visited) {
        if(visited.contains(id))return;if(!visiting.add(id))throw new IllegalArgumentException("Requirement dependency cycle");
        for(var target:next.getOrDefault(id,Set.of()))acyclic(target,next,visiting,visited);
        visiting.remove(id);visited.add(id);
    }
    public static UUID stepId(UUID request,Requirement requirement,Kind kind,UUID sourceBypass) {
        return UUID.nameUUIDFromBytes((request+"\n"+requirement.key()+"\n"+kind+"\n"+Objects.toString(sourceBypass,"")).getBytes(StandardCharsets.UTF_8));
    }
    private static void text(String value){if(value==null || value.isBlank() || value.length()>20000)throw new IllegalArgumentException("Requirement value is missing or too large");}
}
