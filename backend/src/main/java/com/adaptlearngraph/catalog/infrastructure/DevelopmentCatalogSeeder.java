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
                                UNWIND [{code: 'ICT', name: 'Information and Communication Technology'},
                                        {code: 'AI', name: 'Artificial Intelligence'},
                                        {code: 'DATA', name: 'Data Engineering & Analytics'}] AS item
                                MERGE (domain:JobDomain {code: item.code})
                                ON CREATE SET domain.id = randomUUID(), domain.name = item.name,
                                    domain.status = 'ACTIVE', domain.createdAt = datetime(), domain.updatedAt = datetime()
                                """,
                        // 2. Macro Competencies
                        """
                                UNWIND [{code: 'KNOWLEDGE', name: 'Knowledge', description: 'Core technical and conceptual domain knowledge'},
                                        {code: 'COMMUNICATION', name: 'Communication', description: 'Interpersonal, technical communication, and collaboration'},
                                        {code: 'INNOVATION', name: 'Innovation', description: 'Creative problem solving and novel architectural solutions'}] AS item
                                MERGE (macro:MacroCompetency {code: item.code})
                                ON CREATE SET macro.id = randomUUID(), macro.name = item.name, macro.description = item.description,
                                    macro.status = 'ACTIVE', macro.createdAt = datetime(), macro.updatedAt = datetime()
                                ON MATCH SET macro.name = item.name, macro.description = item.description, macro.updatedAt = datetime()
                                """,
                        // 3. Micro Skills
                        """
                                UNWIND [{code: 'JAVA_CORE', name: 'Java Core', macro: 'KNOWLEDGE',
                                         description: 'Core Java programming language fundamentals, OOP, collections, multithreading, and streams API'},
                                        {code: 'SPRING_BOOT', name: 'Spring Boot', macro: 'KNOWLEDGE',
                                         description: 'Enterprise Spring Boot microservices, dependency injection, and REST endpoints'},
                                        {code: 'MS-PY-001', name: 'Python for Machine Learning', macro: 'KNOWLEDGE',
                                         description: 'Python data science stack: NumPy, Pandas, and data processing for ML'},
                                        {code: 'MS-DL-001', name: 'Deep Learning & PyTorch', macro: 'KNOWLEDGE',
                                         description: 'Neural network architectures, tensors, autograd, and training pipelines in PyTorch'},
                                        {code: 'MS-OPS-001', name: 'Containerization with Docker', macro: 'KNOWLEDGE',
                                         description: 'Building Docker container images, multi-stage builds, and container networking'},
                                        {code: 'MS-OPS-002', name: 'Kubernetes Cluster Orchestration', macro: 'KNOWLEDGE',
                                         description: 'Deployments, services, ingress, and cluster orchestration in Kubernetes'}] AS item
                                MERGE (skill:MicroSkill {code: item.code})
                                ON CREATE SET skill.id = randomUUID(), skill.name = item.name, skill.description = item.description,
                                    skill.status = 'ACTIVE', skill.createdAt = datetime(), skill.updatedAt = datetime()
                                ON MATCH SET skill.name = item.name, skill.description = item.description, skill.updatedAt = datetime()
                                WITH skill, item
                                MATCH (macro:MacroCompetency {code: item.macro})
                                MERGE (macro)-[mapping:HAS_SKILL]->(skill)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(), mapping.updatedAt = datetime()
                                """,
                        // 4. Learning Modules
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
                        // 5. Default Organization Target Role
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.name = 'Java Backend Developer P3',
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
                                    role.status = 'ACTIVE', role.updatedAt = datetime()
                                """,
                        // 6. Active Company (comp-technova) Target Roles
                        """
                                MERGE (role:TargetRole {code: 'ROLE-AI-ARCH'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.name = 'AI Knowledge Architect',
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
                                    role.status = 'ACTIVE', role.updatedAt = datetime()
                                """,
                        """
                                MERGE (role:TargetRole {code: 'ROLE-GENAI-01'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.name = 'Generative AI Applications Specialist',
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
                                    role.status = 'DRAFT', role.updatedAt = datetime()
                                """,
                        """
                                MERGE (role:TargetRole {code: 'ROLE-MLOPS-02'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.name = 'Senior MLOps & Graph Systems Engineer',
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
                                    role.status = 'ACTIVE', role.updatedAt = datetime()
                                """,
                        """
                                MERGE (role:TargetRole {code: 'JAVA_BACKEND_P3#comp-technova#v1.0'})
                                ON CREATE SET role.id = randomUUID(), role.createdAt = datetime()
                                SET role.baseCode = 'JAVA_BACKEND_P3',
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
                                    role.status = 'ACTIVE', role.updatedAt = datetime()
                                """,
                        // 7. Domain to TargetRole HAS_ROLE relationships
                        """
                                MATCH (domain:JobDomain), (role:TargetRole)
                                WHERE role.domainCode = domain.code
                                MERGE (domain)-[mapping:HAS_ROLE]->(role)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(),
                                    mapping.updatedAt = datetime()
                                """,
                        // 8. TargetRole REQUIRES_MACRO relationships
                        """
                                MATCH (role:TargetRole), (macro:MacroCompetency {code: 'KNOWLEDGE'})
                                MERGE (role)-[mapping:REQUIRES_MACRO]->(macro)
                                ON CREATE SET mapping.status = 'ACTIVE', mapping.createdAt = datetime(),
                                    mapping.updatedAt = datetime()
                                """,
                        // 9. TargetRole REQUIRES_SKILL relationships
                        """
                                UNWIND [
                                    {roleCode: 'JAVA_BACKEND_P3', skillCode: 'JAVA_CORE', target: 0.60},
                                    {roleCode: 'JAVA_BACKEND_P3', skillCode: 'SPRING_BOOT', target: 0.70},
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
                                ON CREATE SET requirement.targetMastery = item.target,
                                    requirement.status = 'ACTIVE', requirement.createdAt = datetime(),
                                    requirement.updatedAt = datetime()
                                """,
                        // 10. MicroSkill PREREQUISITE_OF relationships
                        """
                                MATCH (java:MicroSkill {code: 'JAVA_CORE'}),
                                      (spring:MicroSkill {code: 'SPRING_BOOT'})
                                MERGE (java)-[prerequisite:PREREQUISITE_OF]->(spring)
                                ON CREATE SET prerequisite.minMastery = 0.60,
                                    prerequisite.status = 'ACTIVE', prerequisite.createdAt = datetime(),
                                    prerequisite.updatedAt = datetime()
                                """,
                        // 11. LearningModule TEACHES relationships
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
                        // 12. LearningModule HAS_ENTRY_REQUIREMENT relationships
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
