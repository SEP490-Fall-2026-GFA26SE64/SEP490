CREATE CONSTRAINT target_role_id IF NOT EXISTS FOR (node:TargetRole) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT target_role_code IF NOT EXISTS FOR (node:TargetRole) REQUIRE node.code IS UNIQUE;
CREATE CONSTRAINT level_id IF NOT EXISTS FOR (node:Level) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT competency_id IF NOT EXISTS FOR (node:Competency) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT micro_skill_id IF NOT EXISTS FOR (node:MicroSkill) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT course_id IF NOT EXISTS FOR (node:Course) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT learning_module_id IF NOT EXISTS FOR (node:LearningModule) REQUIRE node.id IS UNIQUE;
