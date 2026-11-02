package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import java.util.*;
import org.springframework.web.context.request.*;

/** TMP-REQ001-07: substitutes authentication only; missing cookie/account/grant denies. No provisioning. */
public final class LocalPathwayActors implements Actors {
    private final LocalDemoIdentity identity; private final PathwayActorJpaRepository actors;
    public LocalPathwayActors(LocalDemoIdentity identity, PathwayActorJpaRepository actors) { this.identity=identity; this.actors=actors; }
    @Override public Actor require() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes request)) throw new Failure(401,"UNAUTHENTICATED");
        var cookies=request.getRequest().getCookies();
        if (cookies==null || Arrays.stream(cookies).noneMatch(c -> c.getName().equals("baseline_demo_persona"))) throw new Failure(401,"UNAUTHENTICATED");
        String selected;
        try { selected=identity.selected(); } catch (IllegalArgumentException invalid) { throw new Failure(401,"UNAUTHENTICATED"); }
        Role role=switch (selected) {
            case "employee-a" -> Role.EMPLOYEE;
            case "expert" -> Role.DOMAIN_EXPERT;
            default -> throw new Failure(403,"FORBIDDEN");
        };
        UUID id=identity.actor();
        boolean active=actors.hasActiveRole(LocalDemoIdentity.ORG,id,role.name());
        if (!active) throw new Failure(403,"FORBIDDEN");
        return new Actor(LocalDemoIdentity.ORG,id,role);
    }
}
