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
                        // 1. Domains
                        """
                                UNWIND [{id: '20000000-0000-0000-0000-000000000010', code: 'ICT', name: 'Information and Communication Technology'},
                                        {id: '20000000-0000-0000-0000-000000000020', code: 'AI', name: 'Artificial Intelligence'},
                                        {id: '20000000-0000-0000-0000-000000000030', code: 'DATA', name: 'Data Engineering & Analytics'}] AS item
                                MERGE (domain:JobDomain {code: item.code})
                                SET domain.id = item.id,
                                    domain.name = item.name,
                                    domain.status = 'ACTIVE',
                                    domain.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    domain.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 2. Macro Competencies
                        """
                                UNWIND [{id: '30000000-0000-0000-0000-000000000001', code: 'KNOWLEDGE', name: 'Knowledge', description: 'Core technical and conceptual domain knowledge'},
                                        {id: '30000000-0000-0000-0000-000000000002', code: 'COMMUNICATION', name: 'Communication', description: 'Interpersonal, technical communication, and collaboration'},
                                        {id: '30000000-0000-0000-0000-000000000003', code: 'INNOVATION', name: 'Innovation', description: 'Creative problem solving and novel architectural solutions'}] AS item
                                MERGE (macro:MacroCompetency {code: item.code})
                                SET macro.id = item.id, macro.name = item.name, macro.description = item.description,
                                    macro.status = 'ACTIVE',
                                    macro.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    macro.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 3. Micro Skills
                        """
                                UNWIND [{id: '40000000-0000-0000-0000-000000000001', code: 'JAVA_CORE', name: 'Java Core', macro: 'KNOWLEDGE',
                                         description: 'Core Java programming language fundamentals, OOP, collections, multithreading, and streams API'},
                                        {id: '40000000-0000-0000-0000-000000000002', code: 'SPRING_BOOT', name: 'Spring Boot', macro: 'KNOWLEDGE',
                                         description: 'Enterprise Spring Boot microservices, dependency injection, and REST endpoints'},
                                        {id: '40000000-0000-0000-0000-000000000003', code: 'MS-PY-001', name: 'Python for Machine Learning', macro: 'KNOWLEDGE',
                                         description: 'Python data science stack: NumPy, Pandas, and data processing for ML'},
                                        {id: '40000000-0000-0000-0000-000000000004', code: 'MS-DL-001', name: 'Deep Learning & PyTorch', macro: 'KNOWLEDGE',
                                         description: 'Neural network architectures, tensors, autograd, and training pipelines in PyTorch'},
                                        {id: '40000000-0000-0000-0000-000000000005', code: 'MS-OPS-001', name: 'Containerization with Docker', macro: 'KNOWLEDGE',
                                         description: 'Building Docker container images, multi-stage builds, and container networking'},
                                        {id: '40000000-0000-0000-0000-000000000006', code: 'MS-OPS-002', name: 'Kubernetes Cluster Orchestration', macro: 'KNOWLEDGE',
                                         description: 'Deployments, services, ingress, and cluster orchestration in Kubernetes'}] AS item
                                MERGE (skill:MicroSkill {code: item.code})
                                SET skill.id = item.id, skill.name = item.name, skill.description = item.description,
                                    skill.status = 'ACTIVE',
                                    skill.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    skill.updatedAt = datetime('2026-10-01T00:00:00Z')
                                WITH skill, item
                                MATCH (macro:MacroCompetency {code: item.macro})
                                MERGE (macro)-[mapping:HAS_SKILL]->(skill)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 4. Learning Modules
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
                        // 5. Default Organization Target Roles
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                SET role.id = '20000000-0000-0000-0000-000000000001',
                                    role.name = 'Java Backend Developer P3',
                                    role.familyCode = 'JAVA_BACKEND', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'ICT',
                                    role.organizationId = '00000000-0000-0000-0000-000000000001',
                                    role.seniority = 'P3',
                                    role.assignedExpertId = 'expert-rivera',
                                    role.version = '1.0',
                                    role.description = 'Develops and maintains Java backend services',
                                    role.responsibilities = [
                                        'Build and maintain Java backend services',
                                        'Review API and persistence designs'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MERGE (role:TargetRole {code: 'PLATFORM_ENGINEER_P4'})
                                SET role.id = '20000000-0000-0000-0000-000000000002',
                                    role.name = 'Platform Engineer P4',
                                    role.familyCode = 'PLATFORM_ENGINEERING', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'ICT',
                                    role.organizationId = '00000000-0000-0000-0000-000000000001',
                                    role.seniority = 'P4',
                                    role.assignedExpertId = 'expert-rivera',
                                    role.version = '1.0',
                                    role.description = 'Builds reliable internal platforms and delivery automation',
                                    role.responsibilities = [
                                        'Build reusable platform capabilities',
                                        'Improve delivery reliability and observability'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 6. Active Company (comp-technova) Target Roles
                        """
                                MERGE (role:TargetRole {code: 'ROLE-AI-ARCH'})
                                SET role.id = '20000000-0000-0000-0000-000000000003',
                                    role.name = 'AI Knowledge Architect',
                                    role.familyCode = 'AI_ML', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'AI',
                                    role.organizationId = 'comp-technova',
                                    role.seniority = 'P4',
                                    role.assignedExpertId = 'expert-chen',
                                    role.version = '1.0',
                                    role.description = 'Enterprise architect responsible for multi-modal knowledge modeling, graph ML pipelines, and ontological integration.',
                                    role.responsibilities = [
                                        'Model enterprise knowledge graphs',
                                        'Integrate deep learning pipelines'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MERGE (role:TargetRole {code: 'ROLE-GENAI-01'})
                                SET role.id = '20000000-0000-0000-0000-000000000004',
                                    role.name = 'Generative AI Applications Specialist',
                                    role.familyCode = 'AI_ML', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'AI',
                                    role.organizationId = 'comp-technova',
                                    role.seniority = 'P3',
                                    role.assignedExpertId = 'expert-chen',
                                    role.version = '1.0',
                                    role.description = 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection. Awaiting domain expert micro-skill configuration.',
                                    role.responsibilities = [
                                        'Design enterprise prompt pipelines and agentic orchestration workflows',
                                        'Integrate domain knowledge injection and evaluate response safety'
                                    ],
                                    role.status = 'DRAFT',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MERGE (role:TargetRole {code: 'ROLE-MLOPS-02'})
                                SET role.id = '20000000-0000-0000-0000-000000000005',
                                    role.name = 'Senior MLOps & Graph Systems Engineer',
                                    role.familyCode = 'CLOUD_DEVOPS', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'ICT',
                                    role.organizationId = 'comp-technova',
                                    role.seniority = 'P4',
                                    role.assignedExpertId = 'expert-rivera',
                                    role.version = '2.0',
                                    role.description = 'Infrastructure specialist maintaining distributed vector stores, graph databases, and continuous model inference services.',
                                    role.responsibilities = [
                                        'Maintain distributed vector stores, graph databases, and model serving clusters',
                                        'Automate continuous model evaluation and pipeline orchestration'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3#comp-technova#v1.0'})
                                SET role.id = '20000000-0000-0000-0000-000000000006',
                                    role.baseCode = 'JAVA_BACKEND_P3',
                                    role.name = 'Java Backend Developer P3',
                                    role.familyCode = 'JAVA_BACKEND', role.track = 'PROFESSIONAL',
                                    role.domainCode = 'ICT',
                                    role.organizationId = 'comp-technova',
                                    role.seniority = 'P3',
                                    role.assignedExpertId = 'expert-rivera',
                                    role.version = '1.0',
                                    role.description = 'Backend software engineer specializing in high-throughput Java and Spring Boot distributed microservices.',
                                    role.responsibilities = [
                                        'Build high-throughput Java and Spring Boot distributed microservices',
                                        'Review and optimize enterprise persistence architectures and API design'
                                    ],
                                    role.status = 'ACTIVE',
                                    role.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    role.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 7. Domain to TargetRole HAS_ROLE relationships
                        """
                                MATCH (domain:JobDomain), (role:TargetRole)
                                WHERE role.domainCode = domain.code
                                MERGE (domain)-[mapping:HAS_ROLE]->(role)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 8. TargetRole REQUIRES_MACRO relationships
                        """
                                MATCH (role:TargetRole), (macro:MacroCompetency {code: 'KNOWLEDGE'})
                                MERGE (role)-[mapping:REQUIRES_MACRO]->(macro)
                                SET mapping.status = 'ACTIVE',
                                    mapping.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    mapping.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 9. TargetRole REQUIRES_SKILL relationships
                        """
                                UNWIND [
                                    {roleCode: 'JAVA_BACKEND_P3', skillCode: 'JAVA_CORE', target: 0.60},
                                    {roleCode: 'JAVA_BACKEND_P3', skillCode: 'SPRING_BOOT', target: 0.70},
                                    {roleCode: 'PLATFORM_ENGINEER_P4', skillCode: 'SPRING_BOOT', target: 0.80},
                                    {roleCode: 'ROLE-AI-ARCH', skillCode: 'MS-PY-001', target: 0.85},
                                    {roleCode: 'ROLE-AI-ARCH', skillCode: 'MS-DL-001', target: 0.80},
                                    {roleCode: 'ROLE-MLOPS-02', skillCode: 'MS-OPS-001', target: 0.80},
                                    {roleCode: 'ROLE-MLOPS-02', skillCode: 'MS-OPS-002', target: 0.85},
                                    {roleCode: 'JAVA_BACKEND_P3#comp-technova#v1.0', skillCode: 'JAVA_CORE', target: 0.85},
                                    {roleCode: 'JAVA_BACKEND_P3#comp-technova#v1.0', skillCode: 'SPRING_BOOT', target: 0.80}
                                ] AS item
                                MATCH (role:TargetRole {code: item.roleCode}),
                                      (skill:MicroSkill {code: item.skillCode})
                                MERGE (role)-[requirement:REQUIRES_SKILL]->(skill)
                                SET requirement.targetMastery = item.target,
                                    requirement.status = 'ACTIVE',
                                    requirement.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    requirement.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 10. MicroSkill PREREQUISITE_OF relationships
                        """
                                MATCH (java:MicroSkill {code: 'JAVA_CORE'}),
                                      (spring:MicroSkill {code: 'SPRING_BOOT'})
                                MERGE (java)-[prerequisite:PREREQUISITE_OF]->(spring)
                                SET prerequisite.minMastery = 0.60,
                                    prerequisite.status = 'ACTIVE',
                                    prerequisite.createdAt = datetime('2026-10-01T00:00:00Z'),
                                    prerequisite.updatedAt = datetime('2026-10-01T00:00:00Z')
                                """,
                        // 11. LearningModule TEACHES relationships
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
                        // 12. LearningModule HAS_ENTRY_REQUIREMENT relationships
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
