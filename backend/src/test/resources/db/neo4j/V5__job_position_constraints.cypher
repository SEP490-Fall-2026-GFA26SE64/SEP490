CREATE CONSTRAINT job_position_id IF NOT EXISTS FOR (node:JobPosition) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT job_position_code IF NOT EXISTS FOR (node:JobPosition) REQUIRE node.code IS UNIQUE;

