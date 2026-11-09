package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow.Actor;
import com.adaptlearngraph.services.RoleBaselineFlow.Placement;
import com.adaptlearngraph.services.RoleBaselineFlow.Placements;
import java.util.Optional;

/** Reads the existing Admin-owned placement encoding without changing its storage/authoring flow. */
public final class JpaEmployeeCareerPlacements implements Placements {
    private final OrganizationMembershipJpaRepository memberships;
    public JpaEmployeeCareerPlacements(OrganizationMembershipJpaRepository memberships) { this.memberships=memberships; }

    @Override public Optional<Placement> find(Actor actor) {
        return memberships.ownJobPositionName(actor.organizationId(),actor.learnerId()).flatMap(raw->{
            String delimiter=" || TR:";
            int start=raw.indexOf(delimiter);
            if(start<0)return Optional.empty();
            String[] parts=raw.substring(start+delimiter.length()).strip().split("::",-1);
            String id=part(parts,0),code=part(parts,1),name=part(parts,2),level=part(parts,3);
            if(id==null && code==null)return Optional.empty();
            return Optional.of(new Placement(id,code==null?id:code,name==null?(code==null?id:code):name,level));
        });
    }
    private static String part(String[] parts,int index) {
        return parts.length<=index || parts[index].isBlank()?null:parts[index].strip();
    }
}
