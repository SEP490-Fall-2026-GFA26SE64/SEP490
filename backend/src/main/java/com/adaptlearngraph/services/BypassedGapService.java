package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.time.Instant;
import java.util.*;

/** Retained gaps remain discoverable independently of the current target/request. */
public final class BypassedGapService {
    public record Gap(UUID bypassId,UUID sourceRequestId,String roleName,String levelName,Requirement requirement,
            String reason,UUID expertId,Instant decidedAt,boolean achieved,List<Option> options,CertificateReference certificate) {}
    private final Actors actors;private final RequirementPathwayJpaRepository rules;private final RequirementPathwayRevisions revisions;
    private final RequirementPathwayAdmissionService admission;private final RulePathwayCatalog catalog;private final PathwayNotifications notifications;
    public BypassedGapService(Actors actors,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayAdmissionService admission,RulePathwayCatalog catalog,PathwayNotifications notifications) {
        this.actors=actors;this.rules=rules;this.revisions=revisions;this.admission=admission;this.catalog=catalog;this.notifications=notifications;
    }
    public List<Gap> own() {
        var actor=actors.require();actor.require(Role.EMPLOYEE);var result=read(actor.organizationId(),actor.accountId(),null);
        if(!actor.equals(actors.require()))throw new Failure(403,"FORBIDDEN");return result;
    }
    private List<Gap> read(UUID org,UUID learner,UUID sourceRequest) {
        var retained=rules.carried(org,learner);if(retained.size()>1000)throw new Failure(503,"BYPASS_HISTORY_LIMIT");
        var result=new ArrayList<Gap>();var sources=new LinkedHashMap<UUID,List<RequirementPathwayJpaRepository.Carried>>();
        retained.stream().filter(gap->sourceRequest==null || sourceRequest.equals(gap.getSourceRequestId()))
                .forEach(gap->sources.computeIfAbsent(gap.getSourceRequestId(),key->new ArrayList<>()).add(gap));
        for(var entry:sources.entrySet()) {
            var row=rules.own(org,learner,entry.getKey()).orElseThrow(()->new Failure(503,"BYPASS_SOURCE_UNAVAILABLE"));
            var input=admission.decode(row).input();var needs=entry.getValue().stream().map(gap->revisions.requirement(gap.getRequirementSnapshot())).toList();
            var fresh=catalog.providers(new RoleBaselineFlow.Actor(org,learner),input.roleSnapshot(),input.binding().levelId(),needs,Set.of());
            var resolved=needs.stream().map(need->need.provision()==Provision.UNCONFIGURED?fresh.requirements().stream().filter(item->item.key().equals(need.key())).findFirst().orElse(need):need).toList();
            var official=new HashSet<String>();rules.official(org,learner,revisions.encode(resolved)).forEach(proof->official.add(revisions.requirement(proof.getRequirementSnapshot()).proofKey()));
            for(int i=0;i<resolved.size();i++) {
                var gap=entry.getValue().get(i);var need=resolved.get(i);
                var provider=RequirementPathwayGenerationService.step(row.getRequestId(),need,Kind.PARALLEL_SUPPLEMENT,gap.getBypassId(),fresh,null);
                result.add(new Gap(gap.getBypassId(),gap.getSourceRequestId(),gap.getRoleName(),gap.getLevelName(),need,gap.getReason(),gap.getExpertId(),gap.getDecidedAt(),
                        official.contains(need.proofKey()),provider.options(),provider.certificate()));
            }
        }
        return List.copyOf(result);
    }
    public boolean notifyAvailable(UUID org,UUID learner,UUID sourceRequest) {
        var gaps=read(org,learner,sourceRequest);
        for(var gap:gaps)if(!gap.achieved() && (!gap.options().isEmpty() || gap.certificate()!=null))notifications.bypassProvision(org,learner,gap);
        return gaps.stream().anyMatch(gap->!gap.achieved());
    }
}
