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
                                SET domain.id = '20000000-0000-0000-0000-000000000010',
                                    domain.name = 'Information and Communication Technology',
                                    domain.status = 'ACTIVE',
                                    domain.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    domain.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                SET role.id = '20000000-0000-0000-0000-000000000001',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.name = 'Java Backend Developer P3',
                                    role.familyCode = 'JAVA_BACKEND', role.track = 'PROFESSIONAL',
                                    role.organizationId = '00000000-0000-0000-0000-000000000001',
                                    role.seniority = 'P3',
                                    role.description = 'Develops and maintains Java backend services',
                                    role.responsibilities = [
                                        'Build and maintain Java backend services',
                                        'Review API and persistence designs'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                UNWIND [{id: '30000000-0000-0000-0000-000000000001', code: 'KNOWLEDGE', name: 'Knowledge'},
                                        {id: '30000000-0000-0000-0000-000000000002', code: 'COMMUNICATION', name: 'Communication'},
                                        {id: '30000000-0000-0000-0000-000000000003', code: 'INNOVATION', name: 'Innovation'}] AS item
                                MERGE (macro:MacroCompetency {code: item.code})
                                SET macro.id = item.id, macro.name = item.name, macro.status = 'ACTIVE',
                                    macro.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    macro.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                UNWIND [{id: '40000000-0000-0000-0000-000000000001', code: 'JAVA_CORE', name: 'Java Core'},
                                        {id: '40000000-0000-0000-0000-000000000002', code: 'SPRING_BOOT', name: 'Spring Boot'}] AS item
                                MERGE (skill:MicroSkill {code: item.code})
                                SET skill.id = item.id, skill.name = item.name, skill.status = 'ACTIVE',
                                    skill.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    skill.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                UNWIND [{id: '50000000-0000-0000-0000-000000000001',
                                         code: 'JAVA_CORE_INTRO', title: 'Learn Java', provider: 'Oracle',
                                         platform: 'dev.java', sourceUrl: 'https://dev.java/learn/'},
                                        {id: '50000000-0000-0000-0000-000000000002',
                                         code: 'SPRING_BOOT_GUIDE', title: 'Building an Application with Spring Boot',
                                         provider: 'Spring', platform: 'spring.io',
                                         sourceUrl: 'https://spring.io/guides/gs/spring-boot'}] AS item
                                MERGE (module:LearningModule {code: item.code})
                                SET module.id = item.id, module.title = item.title,
                                    module.provider = item.provider, module.platform = item.platform,
                                    module.sourceUrl = item.sourceUrl, module.status = 'ACTIVE',
                                    module.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    module.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MATCH (domain:JobDomain {code: 'ICT'}), (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                MERGE (domain)-[mapping:HAS_ROLE]->(role)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}),
                                      (macro:MacroCompetency {code: 'KNOWLEDGE'})
                                MERGE (role)-[mapping:REQUIRES_MACRO]->(macro)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MATCH (macro:MacroCompetency {code: 'KNOWLEDGE'}), (skill:MicroSkill)
                                WHERE skill.code IN ['JAVA_CORE', 'SPRING_BOOT']
                                MERGE (macro)-[mapping:HAS_SKILL]->(skill)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                UNWIND [{code: 'JAVA_CORE', target: 0.60},
                                        {code: 'SPRING_BOOT', target: 0.70}] AS item
                                MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}),
                                      (skill:MicroSkill {code: item.code})
                                MERGE (role)-[requirement:REQUIRES_SKILL]->(skill)
                                SET requirement.targetMastery = item.target,
                                    requirement.status = 'ACTIVE',
                                    requirement.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    requirement.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MATCH (java:MicroSkill {code: 'JAVA_CORE'}),
                                      (spring:MicroSkill {code: 'SPRING_BOOT'})
                                MERGE (java)-[prerequisite:PREREQUISITE_OF]->(spring)
                                SET prerequisite.minMastery = 0.60,
                                    prerequisite.status = 'ACTIVE',
                                    prerequisite.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    prerequisite.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                UNWIND [{module: 'JAVA_CORE_INTRO', skill: 'JAVA_CORE'},
                                        {module: 'SPRING_BOOT_GUIDE', skill: 'SPRING_BOOT'}] AS item
                                MATCH (module:LearningModule {code: item.module}),
                                      (skill:MicroSkill {code: item.skill})
                                MERGE (module)-[outcome:TEACHES]->(skill)
                                SET outcome.outcomeMastery = 0.70, outcome.coverage = 'CORE',
                                    outcome.status = 'ACTIVE',
                                    outcome.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    outcome.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MATCH (module:LearningModule {code: 'SPRING_BOOT_GUIDE'}),
                                      (skill:MicroSkill {code: 'JAVA_CORE'})
                                MERGE (module)-[requirement:HAS_ENTRY_REQUIREMENT]->(skill)
                                SET requirement.minMastery = 0.60,
                                    requirement.status = 'ACTIVE',
                                    requirement.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    requirement.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """)) {
                    transaction.run(statement).consume();
                }
                return null;
            });
        }
    }
}
