package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.ResolvableType;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.Repository;

/**
 * Tenant- or account-owned JPA entities and Spring Data Neo4j {@code @Node} classes must not be reachable through inherited unscoped CRUD methods
 * (findById/findAll/save/deleteById). Their repositories declare only organization/account-scoped queries and
 * {@link InsertOnlyRepository#insert}, which never merges into an existing row. Graph repositories declare only
 * organization-scoped queries; graph writes go through the tenant guard and scoped Cypher.
 */
class RepositoryTenantSurfaceTest {
    private static final List<String> OWNER_FIELDS = List.of("organizationId", "accountId");

    @Test
    void ownedEntitiesExposeNoUnscopedCrud() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false) {
            @Override
            protected boolean isCandidateComponent(org.springframework.beans.factory.annotation.AnnotatedBeanDefinition definition) {
                return definition.getMetadata().isInterface();
            }
        };
        scanner.addIncludeFilter(new AssignableTypeFilter(Repository.class));
        var violations = new ArrayList<String>();
        int checked = 0;
        int checkedGraph = 0;
        for (var definition : scanner.findCandidateComponents("com.adaptlearngraph.repository")) {
            Class<?> repository = Class.forName(definition.getBeanClassName());
            Class<?> domain = ResolvableType.forClass(repository).as(Repository.class).resolveGeneric(0);
            if (domain == null || !owned(domain)) continue;
            if (domain.isAnnotationPresent(Entity.class)) checked++;
            else if (domain.isAnnotationPresent(Node.class)) checkedGraph++;
            else continue;
            if (CrudRepository.class.isAssignableFrom(repository) || ListCrudRepository.class.isAssignableFrom(repository)
                    || PagingAndSortingRepository.class.isAssignableFrom(repository)) {
                violations.add(repository.getSimpleName());
            }
        }
        assertThat(checked).as("owned repositories inspected").isPositive();
        assertThat(checkedGraph).as("owned graph repositories inspected").isPositive();
        assertThat(violations).as("repositories exposing unscoped CRUD on owned entities").isEmpty();
    }

    private static boolean owned(Class<?> entity) {
        return Arrays.stream(entity.getDeclaredFields()).map(Field::getName).anyMatch(OWNER_FIELDS::contains);
    }
}
