package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.*;
import com.adaptlearngraph.repository.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** Isolated, user-authorized section-3 fixture seed. Never reads activation tokens or existing credentials. */
public final class BrightpathDemoMembers {
    private final JpaMemberActivationAdapter.Repositories data;private final RegistrationSecrets secrets;private final AuditEventJpaRepository audit;
    private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final String password;
    private static final Map<String,String> EXPECTED=Map.of("minhhoang10372@gmail.com","LD_MANAGER","kzvn10372@gmail.com","DOMAIN_EXPERT","proteccmee@gmail.com","EMPLOYEE");
    public BrightpathDemoMembers(JpaMemberActivationAdapter.Repositories data,RegistrationSecrets secrets,AuditEventJpaRepository audit,JdbcTemplate jdbc,TransactionTemplate tx,String password) {
        com.adaptlearngraph.entities.domain.RegistrationFields.validatePassword(password);
        this.data=data;this.secrets=secrets;this.audit=audit;this.jdbc=jdbc;this.tx=tx;this.password=password;
    }
    public int seed() {
        return tx.execute(status->{
            var organizations=jdbc.queryForList("SELECT organization_id FROM platform.organization WHERE lower(code)='brightpath'",UUID.class);
            if(organizations.size()!=1 || !"brightpath_demo".equals(jdbc.queryForObject("SELECT current_database()",String.class)))throw new IllegalStateException("Dedicated Brightpath fixture required");
            var org=organizations.getFirst();data.organizations().lock(org).orElseThrow();
            var pending=data.activations().pendingOf(org);int created=0;
            for(var invitation:pending) {
                String role=EXPECTED.get(invitation.email());if(role==null)continue;
                if(!invitation.roles().equals(List.of(role)))throw new IllegalStateException("Fixture invitation terms changed");
                if(data.accounts().existsByNormalizedIdentifier(invitation.email()))throw new IllegalStateException("Preserve existing account; fixture seed will not overwrite credentials");
                UUID account=UUID.randomUUID(),member=UUID.randomUUID();var now=Instant.now();
                data.accounts().insert(new AccountEntity(account,org,invitation.email(),invitation.email(),secrets.hashPassword(password),now));
                data.profiles().insert(new WorkspaceAccountProfileEntity(account,invitation.fullName(),now));
                data.memberships().insert(new OrganizationMembershipEntity(member,account,org,true,invitation.departmentId(),invitation.jobPositionReferenceId(),now));
                data.roles().insertAll(List.of(new OrganizationMembershipRoleEntity(member,role)));
                if(role.equals("EMPLOYEE"))data.learners().insert(new LearnerStateEntity(account));
                data.activations().consume(org,invitation.activationId(),account,now);
                audit.insert(new AuditEventEntity(UUID.randomUUID(),null,"brightpath-demo-fixture","MEMBER_CREATED",account,null,now,"FIXTURE",UUID.randomUUID()));created++;
            }
            return created;
        });
    }
}
