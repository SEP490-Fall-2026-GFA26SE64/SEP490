package com.adaptlearngraph.assessment.adaptive.demo;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Explicit demo persona, never authentication; only server-owned IDs/organization. */
public final class LocalDemoIdentity {
    public static final UUID ORG = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final UUID BANK = UUID.fromString("2f79de6b-dc62-51a1-982d-0be9d6f588dc");
    public static final String OCC = "OCC-15-1212.00";
    public static final Set<String> PERSONAS = Set.of("ld", "employee-a", "employee-b", "employee-c", "admin", "expert-chen", "expert-vance", "expert-rivera", "expert-nguyen");
    private final Map<String,UUID> additionalAccounts;
    public LocalDemoIdentity() { this(Map.of()); }
    public LocalDemoIdentity(Map<String,UUID> additionalAccounts) {
        if (!additionalAccounts.isEmpty() && (!additionalAccounts.keySet().equals(Set.of("expert")) || additionalAccounts.get("expert")==null))
            throw new IllegalArgumentException("Only the explicit pathway Expert mapping may extend this session");
        this.additionalAccounts=Map.copyOf(additionalAccounts);
    }
    public Set<String> personas() { var aliases=new HashSet<>(PERSONAS); aliases.addAll(additionalAccounts.keySet()); return Set.copyOf(aliases); }
    public static UUID id(String key) { return UUID.nameUUIDFromBytes(("LOCAL_BASELINE_DEMO:"+key).getBytes(StandardCharsets.UTF_8)); }
    public String selected() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            var cookies = attributes.getRequest().getCookies();
            if (cookies != null) for (var cookie : cookies) if ("baseline_demo_persona".equals(cookie.getName())) {
                if (!personas().contains(cookie.getValue())) throw new IllegalArgumentException("Unknown demo persona");
                return cookie.getValue();
            }
        }
        return "ld";
    }
    public UUID actor() { String alias=selected(); return additionalAccounts.getOrDefault(alias,id(alias)); }
    public String role() { return switch(selected()) {
        case "ld" -> "LD_MANAGER";
        case "admin" -> "ADMINISTRATOR";
        case "expert", "expert-chen", "expert-vance", "expert-rivera", "expert-nguyen" -> "DOMAIN_EXPERT";
        case "employee-a", "employee-b", "employee-c" -> "EMPLOYEE";
        default -> throw new IllegalArgumentException("Unknown demo persona");
    }; }
}
