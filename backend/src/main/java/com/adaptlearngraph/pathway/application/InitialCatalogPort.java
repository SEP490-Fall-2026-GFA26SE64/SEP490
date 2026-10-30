package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.RoleGap;
import java.util.*;

/** Trusted catalog release and explicit Role+Level reference; names/requirements come from Neo4j. */
public interface InitialCatalogPort {
    static String choiceId(String roleId,String levelId) {
        RoleGap.text(roleId);RoleGap.text(levelId);
        return "role-level-v1:"+com.adaptlearngraph.recommendation.domain.InitialIdentity.hash("role-level-choice",List.of(roleId,levelId));
    }
    record RoleReference(UUID organizationId,String businessRoleId,String roleId,String levelId,String occupationId,
                         String catalogFingerprint,String releaseToken,Map<String,String> versions) {
        public RoleReference {
            Objects.requireNonNull(organizationId);
            for(String value:List.of(businessRoleId,roleId,levelId,occupationId,catalogFingerprint,releaseToken))RoleGap.text(value);
            versions=Map.copyOf(versions);
            for(String key:List.of("catalog","binding","publication","requirements","compatibility"))RoleGap.text(versions.get(key));
        }
        public static RoleReference from(Scope scope,Binding binding) {
            return new RoleReference(scope.organizationId(),binding.businessRoleId(),binding.roleId(),binding.levelId(),binding.occupationId(),
                    binding.catalogFingerprint(),binding.releaseToken(),binding.versions());
        }
    }
    interface RoleReferences {
        RoleReference require(Actor employee,String roleId,String levelId);
        /** Authoritative owner check of binding/release/grants; no inferred freshness from learner locking. */
        void assertCurrent(Scope scope,RoleReference reference);
    }
    record Release(UUID organizationId,String token,Map<String,String> versions) {
        public Release {
            Objects.requireNonNull(organizationId);RoleGap.text(token);versions=Map.copyOf(versions);
            for(String key:List.of("catalog","publication","requirements","compatibility"))RoleGap.text(versions.get(key));
        }
    }
    interface ReleaseAuthority {
        Release require(Scope scope);
        void assertCurrent(Scope scope,RoleReference reference);
    }
}
