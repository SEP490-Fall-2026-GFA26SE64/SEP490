package com.adaptlearngraph.catalog.infrastructure;

import org.neo4j.driver.Driver;

import java.util.List;

public final class DevelopmentCatalogSeeder {
    private final Driver driver;

    public DevelopmentCatalogSeeder(Driver driver) {
        this.driver = driver;
    }

    public void seed() {
        try (var session = driver.session()) {
            session.executeWrite(transaction -> {
                for (String statement : List.of(
                        """
                                MERGE (domain:JobDomain {code: 'ICT'})
                                ON CREATE SET domain.id = randomUUID(), domain.name = 'Information and Communication Technology',
                                    domain.status = 'ACTIVE', domain.createdAt = datetime(), domain.updatedAt = datetime()
                                """,
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.name = 'Java Backend Developer P3',
                                    role.familyCode = 'JAVA_BACKEND', role.track = 'PROFESSIONAL',
                                    role.organizationId = '00000000-0000-0000-0000-000000000001',
                                    role.seniority = 'P3',
                                    role.description = 'Develops and maintains Java backend services',
                                    role.responsibilities = [
                                        'Build and maintain Java backend services',
                                        'Review API and persistence designs'
                                    ],
                                    role.status = 'ACTIVE', role.updatedAt = datetime()
                                """,
                        """
                                UNWIND [{code: 'KNOWLEDGE', name: 'Knowledge'},
                                        {code: 'COMMUNICATION', name: 'Communication'},
                                        {code: 'INNOVATION', name: 'Innovation'}] AS item
                                MERGE (macro:MacroCompetency {code: item.code})
                                ON CREATE SET macro.id = randomUUID(), macro.name = item.name,
                                    macro.status = 'ACTIVE', macro.createdAt = datetime(), macro.updatedAt = datetime()
                                """,
                        """
                                UNWIND [{code: 'JAVA_CORE', name: 'Java Core'},
                                        {code: 'SPRING_BOOT', name: 'Spring Boot'}] AS item
                                MERGE (skill:MicroSkill {code: item.code})
                                ON CREATE SET skill.id = randomUUID(), skill.name = item.name,
                                    skill.status = 'ACTIVE', skill.createdAt = datetime(), skill.updatedAt = datetime()
                                """,
                        """
                                UNWIND [{code: 'JAVA_CORE_INTRO', title: 'Learn Java', provider: 'Oracle',
                                         platform: 'dev.java', sourceUrl: 'https://dev.java/learn/'},
                                        {code: 'SPRING_BOOT_GUIDE', title: 'Building an Application with Spring Boot',
                                         provider: 'Spring', platform: 'spring.io',
                                         sourceUrl: 'https://spring.io/guides/gs/spring-boot'}] AS item
                                MERGE (module:LearningModule {code: item.code})
                                ON CREATE SET module.id = randomUUID(), module.title = item.title,
                                    module.provider = item.provider, module.platform = item.platform,
                                    module.sourceUrl = item.sourceUrl, module.status = 'ACTIVE',
                                    module.createdAt = datetime(), module.updatedAt = datetime()
                                """,
                        """
                                MATCH (domain:JobDomain {code: 'ICT'}), (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                MERGE (domain)-[mapping:HAS_ROLE]->(role)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(),
                                    mapping.updatedAt = datetime()
                                """,
                        """
                                MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}),
                                      (macro:MacroCompetency {code: 'KNOWLEDGE'})
                                MERGE (role)-[mapping:REQUIRES_MACRO]->(macro)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(),
                                    mapping.updatedAt = datetime()
                                """,
                        """
                                MATCH (macro:MacroCompetency {code: 'KNOWLEDGE'}), (skill:MicroSkill)
                                WHERE skill.code IN ['JAVA_CORE', 'SPRING_BOOT']
                                MERGE (macro)-[mapping:HAS_SKILL]->(skill)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(),
                                    mapping.updatedAt = datetime()
                                """,
                        """
                                UNWIND [{code: 'JAVA_CORE', target: 0.60},
                                        {code: 'SPRING_BOOT', target: 0.70}] AS item
                                MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}),
                                      (skill:MicroSkill {code: item.code})
                                MERGE (role)-[requirement:REQUIRES_SKILL]->(skill)
                                ON CREATE SET requirement.targetMastery = item.target,
                                    requirement.status = 'ACTIVE', requirement.createdAt = datetime(),
                                    requirement.updatedAt = datetime()
                                """,
                        """
                                MATCH (java:MicroSkill {code: 'JAVA_CORE'}),
                                      (spring:MicroSkill {code: 'SPRING_BOOT'})
                                MERGE (java)-[prerequisite:PREREQUISITE_OF]->(spring)
                                ON CREATE SET prerequisite.minMastery = 0.60,
                                    prerequisite.status = 'ACTIVE', prerequisite.createdAt = datetime(),
                                    prerequisite.updatedAt = datetime()
                                """,
                        """
                                UNWIND [{module: 'JAVA_CORE_INTRO', skill: 'JAVA_CORE'},
                                        {module: 'SPRING_BOOT_GUIDE', skill: 'SPRING_BOOT'}] AS item
                                MATCH (module:LearningModule {code: item.module}),
                                      (skill:MicroSkill {code: item.skill})
                                MERGE (module)-[outcome:TEACHES]->(skill)
                                ON CREATE SET outcome.outcomeMastery = 0.70, outcome.coverage = 'CORE',
                                    outcome.status = 'ACTIVE', outcome.createdAt = datetime(),
                                    outcome.updatedAt = datetime()
                                """,
                        """
                                MATCH (module:LearningModule {code: 'SPRING_BOOT_GUIDE'}),
                                      (skill:MicroSkill {code: 'JAVA_CORE'})
                                MERGE (module)-[requirement:HAS_ENTRY_REQUIREMENT]->(skill)
                                ON CREATE SET requirement.minMastery = 0.60,
                                    requirement.status = 'ACTIVE', requirement.createdAt = datetime(),
                                    requirement.updatedAt = datetime()
                                """)) {
                    transaction.run(statement).consume();
                }
                return null;
            });
        }
    }
}
