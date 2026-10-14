CREATE CONSTRAINT occupation_id IF NOT EXISTS FOR (node:Occupation) REQUIRE node.id IS UNIQUE;
CREATE CONSTRAINT occupation_code IF NOT EXISTS FOR (node:Occupation) REQUIRE node.code IS UNIQUE;
