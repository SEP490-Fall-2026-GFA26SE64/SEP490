// Certificate identity is unique; assigning a definition does not replace shared/template Skills.
CREATE CONSTRAINT certificate_id_unique IF NOT EXISTS FOR (c:Certificate) REQUIRE c.id IS UNIQUE;
