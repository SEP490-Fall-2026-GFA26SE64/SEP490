CREATE CONSTRAINT department_id IF NOT EXISTS FOR (node:Department) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT department_code IF NOT EXISTS FOR (node:Department) REQUIRE (node.organizationId, node.code) IS UNIQUE;

