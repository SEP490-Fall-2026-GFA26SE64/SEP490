CREATE TABLE platform.target_role (
    role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id text NOT NULL,
    code text NOT NULL CHECK (code = upper(btrim(code)) AND code <> ''),
    name text NOT NULL CHECK (btrim(name) <> ''),
    domain_code text NOT NULL DEFAULT 'ICT',
    family_code text NOT NULL DEFAULT 'JAVA_BACKEND',
    track text NOT NULL DEFAULT 'PROFESSIONAL' CHECK (track IN ('PROFESSIONAL', 'MANAGEMENT')),
    assigned_expert_id text,
    description text,
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'REJECTED', 'ACTIVE', 'RETIRED')),
    version text NOT NULL DEFAULT '1.0',
    skill_targets text NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT target_role_org_code_version_key UNIQUE (organization_id, code, version)
);

CREATE INDEX target_role_org_idx ON platform.target_role(organization_id);
CREATE INDEX target_role_expert_idx ON platform.target_role(assigned_expert_id);

-- Seed target roles for active company 'comp-technova'
INSERT INTO platform.target_role (
    role_id, organization_id, code, name, domain_code, family_code, track, assigned_expert_id, description, status, version, skill_targets
) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'comp-technova', 'ROLE-AI-ARCH', 'AI Knowledge Architect', 'AI', 'AI_ML', 'PROFESSIONAL', 'expert-chen', 'Enterprise architect responsible for multi-modal knowledge modeling, graph ML pipelines, and ontological integration.', 'ACTIVE', '1.0', '[{"skillId":"ms-python-ml","skillCode":"MS-PY-001","skillName":"Python for Machine Learning","threshold":85},{"skillId":"ms-deep-learning","skillCode":"MS-DL-001","skillName":"Deep Learning & PyTorch","threshold":80}]'),
    ('a0000001-0000-0000-0000-000000000002', 'comp-technova', 'ROLE-GENAI-01', 'Generative AI Applications Specialist', 'AI', 'AI_ML', 'PROFESSIONAL', 'expert-chen', 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection. Awaiting domain expert micro-skill configuration.', 'DRAFT', '1.0', '[]'),
    ('a0000001-0000-0000-0000-000000000003', 'comp-technova', 'ROLE-MLOPS-02', 'Senior MLOps & Graph Systems Engineer', 'ICT', 'CLOUD_DEVOPS', 'PROFESSIONAL', 'expert-rivera', 'Infrastructure specialist maintaining distributed vector stores, graph databases, and continuous model inference services.', 'ACTIVE', '2.0', '[{"skillId":"ms-docker","skillCode":"MS-OPS-001","skillName":"Containerization with Docker","threshold":80},{"skillId":"ms-k8s","skillCode":"MS-OPS-002","skillName":"Kubernetes Cluster Orchestration","threshold":85}]'),
    ('a0000001-0000-0000-0000-000000000004', 'comp-technova', 'JAVA_BACKEND_P3', 'Java Backend Developer P3', 'ICT', 'JAVA_BACKEND', 'PROFESSIONAL', 'expert-rivera', 'Backend software engineer specializing in high-throughput Java and Spring Boot distributed microservices.', 'ACTIVE', '1.0', '[{"skillId":"ms-java-core","skillCode":"JAVA_CORE","skillName":"Java Core Craftsmanship","threshold":85},{"skillId":"ms-spring-boot","skillCode":"SPRING_BOOT","skillName":"Spring Boot Enterprise Services","threshold":80}]')
ON CONFLICT (organization_id, code, version) DO NOTHING;

-- Seed target roles for 'default-org'
INSERT INTO platform.target_role (
    role_id, organization_id, code, name, domain_code, family_code, track, assigned_expert_id, description, status, version, skill_targets
) VALUES
    ('b0000001-0000-0000-0000-000000000001', 'default-org', 'ROLE-AI-ARCH', 'AI Knowledge Architect', 'AI', 'AI_ML', 'PROFESSIONAL', 'expert-chen', 'Enterprise architect responsible for multi-modal knowledge modeling, graph ML pipelines, and ontological integration.', 'ACTIVE', '1.0', '[{"skillId":"ms-python-ml","skillCode":"MS-PY-001","skillName":"Python for Machine Learning","threshold":85},{"skillId":"ms-deep-learning","skillCode":"MS-DL-001","skillName":"Deep Learning & PyTorch","threshold":80}]'),
    ('b0000001-0000-0000-0000-000000000002', 'default-org', 'ROLE-GENAI-01', 'Generative AI Applications Specialist', 'AI', 'AI_ML', 'PROFESSIONAL', 'expert-chen', 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection. Awaiting domain expert micro-skill configuration.', 'DRAFT', '1.0', '[]'),
    ('b0000001-0000-0000-0000-000000000003', 'default-org', 'ROLE-MLOPS-02', 'Senior MLOps & Graph Systems Engineer', 'ICT', 'CLOUD_DEVOPS', 'PROFESSIONAL', 'expert-rivera', 'Infrastructure specialist maintaining distributed vector stores, graph databases, and continuous model inference services.', 'ACTIVE', '2.0', '[{"skillId":"ms-docker","skillCode":"MS-OPS-001","skillName":"Containerization with Docker","threshold":80},{"skillId":"ms-k8s","skillCode":"MS-OPS-002","skillName":"Kubernetes Cluster Orchestration","threshold":85}]'),
    ('b0000001-0000-0000-0000-000000000004', 'default-org', 'JAVA_BACKEND_P3', 'Java Backend Developer P3', 'ICT', 'JAVA_BACKEND', 'PROFESSIONAL', 'expert-rivera', 'Backend software engineer specializing in high-throughput Java and Spring Boot distributed microservices.', 'ACTIVE', '1.0', '[{"skillId":"ms-java-core","skillCode":"JAVA_CORE","skillName":"Java Core Craftsmanship","threshold":85},{"skillId":"ms-spring-boot","skillCode":"SPRING_BOOT","skillName":"Spring Boot Enterprise Services","threshold":80}]')
ON CONFLICT (organization_id, code, version) DO NOTHING;

