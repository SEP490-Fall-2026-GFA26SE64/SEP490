package com.adaptlearngraph.assessment.adaptive;

import static org.assertj.core.api.Assertions.*;

import com.adaptlearngraph.assessment.adaptive.infrastructure.WorkspaceBaselineResources;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

class WorkspaceBaselineResourcesIntegrationTest {
    @Test
    void upgradesExistingIdentityHistoryAndEnforcesResourceTenantAndNullableReadiness() {
        try (var postgres = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            postgres.start();
            var source = new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
            var jdbc = new JdbcTemplate(source);
            Flyway.configure().dataSource(source).target("12").load().migrate();
            var checksums = jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank");
            UUID org = UUID.randomUUID(), other = UUID.randomUUID(), owner = UUID.randomUUID();
            UUID department = UUID.randomUUID(), reference = UUID.randomUUID(), foreignDepartment = UUID.randomUUID(), foreignReference = UUID.randomUUID();
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'UPGRADE_A','Upgrade A'),(?,'UPGRADE_B','Upgrade B')", org, other);
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,'fixture','fixture','test-only')", owner, other);
            jdbc.update("INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES (?,?,'A',true),(?,?,'B',true)", department,org,foreignDepartment,other);
            jdbc.update("""
                    INSERT INTO platform.occupation_department_reference(occupation_reference_id,occupation_id,organization_id,department_id,name,active)
                    VALUES (?,?,?,?,'A',true),(?,?,?,?,'B',true)
                    """, reference,UUID.randomUUID(),org,department,foreignReference,UUID.randomUUID(),other,foreignDepartment);
            var migration = Flyway.configure().dataSource(source).load();
            assertThat(migration.migrate().migrationsExecuted).isEqualTo(22);
            assertThat(migration.migrate().migrationsExecuted).isZero();
            migration.validate();
            assertThat(jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE installed_rank<=12 ORDER BY installed_rank")).isEqualTo(checksums);
            assertThat(jdbc.queryForObject("SELECT organization_id FROM platform.account WHERE account_id=?",UUID.class,owner)).isEqualTo(other);
            jdbc.update("INSERT INTO platform.workspace_baseline_resource(organization_id,occupation_reference_id,graph_occupation_id) VALUES (?,?,'occupation-a')", org,reference);
            var resources = new WorkspaceBaselineResources(new NamedParameterJdbcTemplate(source));
            var binding = resources.find(org,"occupation-a").orElseThrow();
            assertThat(binding.ready()).isFalse();
            assertThat(binding.bankId()).isNull();
            assertThat(binding.modelId()).isNull();
            assertThat(binding.mappingId()).isNull();
            assertThat(resources.occupations(other)).isEmpty();
            assertThat(resources.find(other,"occupation-a")).isEmpty();
            assertThatThrownBy(() -> jdbc.update("""
                    INSERT INTO platform.workspace_baseline_resource(organization_id,occupation_reference_id,graph_occupation_id)
                    VALUES (?,?,'foreign-reference')
                    """,org,foreignReference)).isInstanceOf(DataIntegrityViolationException.class);
            UUID bank=UUID.randomUUID();
            jdbc.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'Foreign bank',?)",bank,owner);
            assertThatThrownBy(() -> jdbc.update("UPDATE platform.workspace_baseline_resource SET question_bank_id=? WHERE organization_id=?",bank,org))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("UPDATE platform.department_reference SET active=false WHERE department_id=?",department);
            assertThat(resources.occupations(org)).isEmpty();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.workspace_baseline_resource",Long.class)).isOne();
        }
    }
}
