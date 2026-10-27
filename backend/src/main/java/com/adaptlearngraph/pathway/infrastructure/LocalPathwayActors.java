package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.context.request.*;

/** TMP-REQ001-07: substitutes authentication only; missing cookie/account/grant denies. No provisioning. */
public final class LocalPathwayActors implements Actors {
    private final LocalDemoIdentity identity; private final NamedParameterJdbcTemplate jdbc;
    public LocalPathwayActors(LocalDemoIdentity identity, NamedParameterJdbcTemplate jdbc) { this.identity=identity; this.jdbc=jdbc; }
    @Override public Actor require() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes request)) throw new Failure(401,"UNAUTHENTICATED");
        var cookies=request.getRequest().getCookies();
        if (cookies==null || Arrays.stream(cookies).noneMatch(c -> c.getName().equals("baseline_demo_persona"))) throw new Failure(401,"UNAUTHENTICATED");
        String selected;
        try { selected=identity.selected(); } catch (IllegalArgumentException invalid) { throw new Failure(401,"UNAUTHENTICATED"); }
        Role role=switch (selected) {
            case "employee-a", "employee-b", "employee-c" -> Role.EMPLOYEE;
            case "expert" -> Role.DOMAIN_EXPERT;
            default -> throw new Failure(403,"FORBIDDEN");
        };
        UUID id=identity.actor();
        boolean active=Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.account a JOIN platform.account_role r USING(account_id)
                  WHERE a.account_id=:actor AND a.organization_id=:org AND a.active AND r.role_code=:role)
                """,Map.of("actor",id,"org",LocalDemoIdentity.ORG,"role",role.name()),Boolean.class));
        if (!active) throw new Failure(403,"FORBIDDEN");
        return new Actor(LocalDemoIdentity.ORG,id,role);
    }
}
