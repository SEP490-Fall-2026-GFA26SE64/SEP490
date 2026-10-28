package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.RoleGap;
import java.math.BigDecimal;
import java.util.*;

public final class InitialPlanningPorts {
    public record Limits(String version,int maxClosureNodes,int maxClosureEdges,int maxProviders,int batchSize,long maxSearchStates) {
        public Limits {
            RoleGap.text(version);
            if(maxClosureNodes<1 || maxClosureEdges<1 || maxProviders<1 || batchSize<1 || maxSearchStates<1) throw new IllegalArgumentException("Explicit positive search limits required");
        }
    }
    public record Provider(String moduleId,String title,String contentVersion,BigDecimal durationMinutes,BigDecimal priceVnd,
                           String skillId,TeachingFocus teachingFocus,Difficulty difficultyLevel) {}
    public record Graph(Set<String> skillIds,List<Edge> edges,List<Provider> providers,String releaseToken) {
        public Graph { skillIds=Set.copyOf(skillIds); edges=List.copyOf(edges); providers=List.copyOf(providers); RoleGap.text(releaseToken); }
    }
    public record Suitability(boolean eligible,int preference,boolean foundationalSuitable,String version,String reason) {
        public Suitability { RoleGap.text(version); RoleGap.text(reason); if(preference<0) throw new IllegalArgumentException("Invalid preference"); }
    }
    public record PrerequisiteNeed(boolean learningRequired,boolean foundational,String evidenceIdentity,BigDecimal mastery,String unknownReason) {
        public PrerequisiteNeed {
            RoleGap.text(evidenceIdentity);
            if(mastery!=null){RoleGap.unit(mastery);if(unknownReason!=null)throw new IllegalArgumentException("Ambiguous prerequisite evidence");}
        }
        public PrerequisiteNeed(boolean learningRequired,boolean foundational,String evidenceIdentity) {
            this(learningRequired,foundational,evidenceIdentity,null,null);
        }
    }
    public interface Graphs { Graph load(Scope scope,Binding binding,Set<String> skills,Limits limits); }
    public interface SuitabilityPolicy { Suitability evaluate(Scope scope,Binding binding,Need need,Provider provider); }
    public interface ReadinessDefinitions {
        PrerequisiteNeed prerequisite(Scope scope,Binding binding,Edge edge);
        Optional<GateDefinition> gate(Scope scope,Binding binding,Provider provider,Edge edge);
    }
    public interface Availability {
        boolean available(Scope scope,String moduleId,String contentVersion);
        default void requireAvailable(Scope scope,String moduleId,String contentVersion) {
            if(!available(scope,moduleId,contentVersion))throw new Failure(503,"CONTENT_UNAVAILABLE",false);
        }
    }
    public interface LiveReadiness {
        /** Must verify version-matched evidence for each gate, including internal segment access. */
        boolean passed(Scope scope,Dependency gate);
    }
    public interface ContentAccess {
        /** Owner returns a protected entry that enforces these internal segment gates on every access. */
        String requireEntry(Scope scope,String moduleId,String contentVersion,List<Dependency> internalGates);
    }
    private InitialPlanningPorts() {}
}
