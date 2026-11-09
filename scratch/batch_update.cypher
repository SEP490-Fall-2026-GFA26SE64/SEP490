MATCH (s:MicroSkill) SET s.code = coalesce(s.code, s.sourceId, s.id);
MATCH (r:TargetRole) WHERE r.assignedExpertId = 'a0000000-0000-0000-0000-000000000002' SET r.assignedExpertId = null;
MATCH (l:Level {id: 'ab36cabe-a861-38a8-9ab1-01a1a319b4f0'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['f79c96bf-4063-3f6d-9f28-b97d09ce7783','82078cb4-9ae6-316e-9651-1b648a12ff3d'] DELETE rel;
MATCH (l:Level {id: 'ab36cabe-a861-38a8-9ab1-01a1a319b4f0'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['1840a13b-3fab-3472-baf1-75261dfec093','ee5d9c78-ac73-32b2-9712-3fa261fe2eeb','d7c02c30-0e06-360c-ac5e-2456dddcfded'] DELETE rel;

            MATCH (l:Level {id: 'ab36cabe-a861-38a8-9ab1-01a1a319b4f0'}), (s:MicroSkill {id: '1840a13b-3fab-3472-baf1-75261dfec093'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'ab36cabe-a861-38a8-9ab1-01a1a319b4f0'}), (s:MicroSkill {id: 'ee5d9c78-ac73-32b2-9712-3fa261fe2eeb'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'ab36cabe-a861-38a8-9ab1-01a1a319b4f0'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: 'e2a8eb6a-e62a-32d8-918e-3968f589b882'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['e1d41c3a-e861-38cb-b804-cce8350288c1','36ebbacb-2299-3782-885c-cf3f8c2a1abc'] DELETE rel;
MATCH (l:Level {id: 'e2a8eb6a-e62a-32d8-918e-3968f589b882'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['5800be2b-f27c-375e-855f-9026cc8a78ab','3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a','d7c02c30-0e06-360c-ac5e-2456dddcfded'] DELETE rel;

            MATCH (l:Level {id: 'e2a8eb6a-e62a-32d8-918e-3968f589b882'}), (s:MicroSkill {id: '5800be2b-f27c-375e-855f-9026cc8a78ab'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'e2a8eb6a-e62a-32d8-918e-3968f589b882'}), (s:MicroSkill {id: '3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'e2a8eb6a-e62a-32d8-918e-3968f589b882'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '4060f9e1-7b93-3a2f-9df4-94f2e07a8d8f'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['d010dc2a-83c3-337a-835f-f21071c551ba','d440ce26-1eaf-303a-8a20-b7cce013f7ad'] DELETE rel;
MATCH (l:Level {id: '4060f9e1-7b93-3a2f-9df4-94f2e07a8d8f'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['c0f03a7a-6d96-36f0-816d-b0b88a4a6de6','d7c02c30-0e06-360c-ac5e-2456dddcfded','5800be2b-f27c-375e-855f-9026cc8a78ab'] DELETE rel;

            MATCH (l:Level {id: '4060f9e1-7b93-3a2f-9df4-94f2e07a8d8f'}), (s:MicroSkill {id: 'c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '4060f9e1-7b93-3a2f-9df4-94f2e07a8d8f'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '4060f9e1-7b93-3a2f-9df4-94f2e07a8d8f'}), (s:MicroSkill {id: '5800be2b-f27c-375e-855f-9026cc8a78ab'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

      MATCH (r:TargetRole {id: 'fc9d2f2b-c9fe-3996-89b2-96df0ddf59a7'})
      SET r.levelCompetencies = "{\"Senior\":[\"f79c96bf-4063-3f6d-9f28-b97d09ce7783\",\"82078cb4-9ae6-316e-9651-1b648a12ff3d\"],\"Middle\":[\"e1d41c3a-e861-38cb-b804-cce8350288c1\",\"36ebbacb-2299-3782-885c-cf3f8c2a1abc\"],\"Junior\":[\"d010dc2a-83c3-337a-835f-f21071c551ba\",\"d440ce26-1eaf-303a-8a20-b7cce013f7ad\"]}",
          r.skillTargets = "[{\"skillId\":\"1840a13b-3fab-3472-baf1-75261dfec093\",\"skillCode\":\"MS-FS05\",\"skillName\":\"integrate system components\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb\",\"skillCode\":\"MS-CORE01\",\"skillName\":\"Implement programs and scripts\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"5800be2b-f27c-375e-855f-9026cc8a78ab\",\"skillCode\":\"MS-FS04\",\"skillName\":\"use query languages\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a\",\"skillCode\":\"MS-FS06\",\"skillName\":\"debug software\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"c0f03a7a-6d96-36f0-816d-b0b88a4a6de6\",\"skillCode\":\"MS-FS07\",\"skillName\":\"perform software unit testing\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"5800be2b-f27c-375e-855f-9026cc8a78ab\",\"skillCode\":\"MS-FS04\",\"skillName\":\"use query languages\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]}]",
          r.competencyIds = ['f79c96bf-4063-3f6d-9f28-b97d09ce7783','82078cb4-9ae6-316e-9651-1b648a12ff3d','e1d41c3a-e861-38cb-b804-cce8350288c1','36ebbacb-2299-3782-885c-cf3f8c2a1abc','d010dc2a-83c3-337a-835f-f21071c551ba','d440ce26-1eaf-303a-8a20-b7cce013f7ad'],
          r.assignedExpertId = null;
    
MATCH (l:Level {id: 'eecb2663-ec59-32d7-ab8c-78903add6943'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['f04b6376-bb4e-367c-8983-79b93421393e','61f90f2c-6b37-3074-af1c-6443a31d69da'] DELETE rel;
MATCH (l:Level {id: 'eecb2663-ec59-32d7-ab8c-78903add6943'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a','3e30897e-618d-3077-b633-58a34720f528','22e71489-8886-3833-934e-acd5b63a9041'] DELETE rel;

            MATCH (l:Level {id: 'eecb2663-ec59-32d7-ab8c-78903add6943'}), (s:MicroSkill {id: '3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'eecb2663-ec59-32d7-ab8c-78903add6943'}), (s:MicroSkill {id: '3e30897e-618d-3077-b633-58a34720f528'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'eecb2663-ec59-32d7-ab8c-78903add6943'}), (s:MicroSkill {id: '22e71489-8886-3833-934e-acd5b63a9041'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: 'b32de38c-0bdc-3107-adf6-189e78ba0d0c'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['6070e44b-6a4b-39af-a0a3-ff70a67e2709','40492450-d6e6-3344-8d82-9563ffdea817'] DELETE rel;
MATCH (l:Level {id: 'b32de38c-0bdc-3107-adf6-189e78ba0d0c'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['c0f03a7a-6d96-36f0-816d-b0b88a4a6de6','d7c02c30-0e06-360c-ac5e-2456dddcfded','7b34dda7-5cbf-3dbb-aa1e-199d36777d76'] DELETE rel;

            MATCH (l:Level {id: 'b32de38c-0bdc-3107-adf6-189e78ba0d0c'}), (s:MicroSkill {id: 'c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'b32de38c-0bdc-3107-adf6-189e78ba0d0c'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'b32de38c-0bdc-3107-adf6-189e78ba0d0c'}), (s:MicroSkill {id: '7b34dda7-5cbf-3dbb-aa1e-199d36777d76'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '85455a82-efd7-3e91-971c-2c9e3485edfd'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['e9ce4a4f-a815-375f-b03c-e32b8b8276a3','cca10d20-58e2-3979-b1a5-b45d516a810a'] DELETE rel;
MATCH (l:Level {id: '85455a82-efd7-3e91-971c-2c9e3485edfd'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['8b9f0a45-8945-30d7-afab-39f64befc383','c0f03a7a-6d96-36f0-816d-b0b88a4a6de6','22e71489-8886-3833-934e-acd5b63a9041'] DELETE rel;

            MATCH (l:Level {id: '85455a82-efd7-3e91-971c-2c9e3485edfd'}), (s:MicroSkill {id: '8b9f0a45-8945-30d7-afab-39f64befc383'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '85455a82-efd7-3e91-971c-2c9e3485edfd'}), (s:MicroSkill {id: 'c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '85455a82-efd7-3e91-971c-2c9e3485edfd'}), (s:MicroSkill {id: '22e71489-8886-3833-934e-acd5b63a9041'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

      MATCH (r:TargetRole {id: '94192c97-2ed3-34a9-a2a8-b9fa55ce68c0'})
      SET r.levelCompetencies = "{\"Senior\":[\"f04b6376-bb4e-367c-8983-79b93421393e\",\"61f90f2c-6b37-3074-af1c-6443a31d69da\"],\"Middle\":[\"6070e44b-6a4b-39af-a0a3-ff70a67e2709\",\"40492450-d6e6-3344-8d82-9563ffdea817\"],\"Junior\":[\"e9ce4a4f-a815-375f-b03c-e32b8b8276a3\",\"cca10d20-58e2-3979-b1a5-b45d516a810a\"]}",
          r.skillTargets = "[{\"skillId\":\"3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a\",\"skillCode\":\"MS-FS06\",\"skillName\":\"debug software\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"3e30897e-618d-3077-b633-58a34720f528\",\"skillCode\":\"MS-FS12\",\"skillName\":\"Validate application inputs\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"22e71489-8886-3833-934e-acd5b63a9041\",\"skillCode\":\"MS-DE10\",\"skillName\":\"Implement data extraction\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"c0f03a7a-6d96-36f0-816d-b0b88a4a6de6\",\"skillCode\":\"MS-FS07\",\"skillName\":\"perform software unit testing\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"7b34dda7-5cbf-3dbb-aa1e-199d36777d76\",\"skillCode\":\"MS-ARC04\",\"skillName\":\"Specify measurable service quality targets\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"8b9f0a45-8945-30d7-afab-39f64befc383\",\"skillCode\":\"MS-FS13\",\"skillName\":\"Enforce application authorization\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"c0f03a7a-6d96-36f0-816d-b0b88a4a6de6\",\"skillCode\":\"MS-FS07\",\"skillName\":\"perform software unit testing\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"22e71489-8886-3833-934e-acd5b63a9041\",\"skillCode\":\"MS-DE10\",\"skillName\":\"Implement data extraction\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]}]",
          r.competencyIds = ['f04b6376-bb4e-367c-8983-79b93421393e','61f90f2c-6b37-3074-af1c-6443a31d69da','6070e44b-6a4b-39af-a0a3-ff70a67e2709','40492450-d6e6-3344-8d82-9563ffdea817','e9ce4a4f-a815-375f-b03c-e32b8b8276a3','cca10d20-58e2-3979-b1a5-b45d516a810a'],
          r.assignedExpertId = null;
    
MATCH (l:Level {id: '588253ad-07e3-3157-9911-70b17056cb7e'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['bc38aef2-3b40-3b54-b379-84001f37a1bc','bda74efc-57b0-3805-9a30-e9f314ecc0bd'] DELETE rel;
MATCH (l:Level {id: '588253ad-07e3-3157-9911-70b17056cb7e'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['d7c02c30-0e06-360c-ac5e-2456dddcfded','2d463e46-d58d-3fa6-bbbc-6a2fe45bca39','5800be2b-f27c-375e-855f-9026cc8a78ab'] DELETE rel;

            MATCH (l:Level {id: '588253ad-07e3-3157-9911-70b17056cb7e'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '588253ad-07e3-3157-9911-70b17056cb7e'}), (s:MicroSkill {id: '2d463e46-d58d-3fa6-bbbc-6a2fe45bca39'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '588253ad-07e3-3157-9911-70b17056cb7e'}), (s:MicroSkill {id: '5800be2b-f27c-375e-855f-9026cc8a78ab'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '1291b7d7-64a3-33d1-9f26-7e4c8c593b47'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['4f78da20-51f7-322a-91b3-856c8cbb9b80','031ba8ca-74f6-394b-ad78-9cd48cb92b0c'] DELETE rel;
MATCH (l:Level {id: '1291b7d7-64a3-33d1-9f26-7e4c8c593b47'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['c0f03a7a-6d96-36f0-816d-b0b88a4a6de6','8b9f0a45-8945-30d7-afab-39f64befc383','b88375da-7c30-33fe-910b-aa40b1779faf'] DELETE rel;

            MATCH (l:Level {id: '1291b7d7-64a3-33d1-9f26-7e4c8c593b47'}), (s:MicroSkill {id: 'c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '1291b7d7-64a3-33d1-9f26-7e4c8c593b47'}), (s:MicroSkill {id: '8b9f0a45-8945-30d7-afab-39f64befc383'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '1291b7d7-64a3-33d1-9f26-7e4c8c593b47'}), (s:MicroSkill {id: 'b88375da-7c30-33fe-910b-aa40b1779faf'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: 'cbd3e2b4-e00c-3529-9b2b-61381088d9b6'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['919446f8-e76c-3316-89aa-fb7cad8ac68e','2df40d12-1cd5-3119-9c24-ad4bbccec298'] DELETE rel;
MATCH (l:Level {id: 'cbd3e2b4-e00c-3529-9b2b-61381088d9b6'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['b88375da-7c30-33fe-910b-aa40b1779faf','ee5d9c78-ac73-32b2-9712-3fa261fe2eeb','c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'] DELETE rel;

            MATCH (l:Level {id: 'cbd3e2b4-e00c-3529-9b2b-61381088d9b6'}), (s:MicroSkill {id: 'b88375da-7c30-33fe-910b-aa40b1779faf'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'cbd3e2b4-e00c-3529-9b2b-61381088d9b6'}), (s:MicroSkill {id: 'ee5d9c78-ac73-32b2-9712-3fa261fe2eeb'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'cbd3e2b4-e00c-3529-9b2b-61381088d9b6'}), (s:MicroSkill {id: 'c0f03a7a-6d96-36f0-816d-b0b88a4a6de6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

      MATCH (r:TargetRole {id: '8efdff91-f8ff-3608-9be7-2500f7351643'})
      SET r.levelCompetencies = "{\"Senior\":[\"bc38aef2-3b40-3b54-b379-84001f37a1bc\",\"bda74efc-57b0-3805-9a30-e9f314ecc0bd\"],\"Middle\":[\"4f78da20-51f7-322a-91b3-856c8cbb9b80\",\"031ba8ca-74f6-394b-ad78-9cd48cb92b0c\"],\"Junior\":[\"919446f8-e76c-3316-89aa-fb7cad8ac68e\",\"2df40d12-1cd5-3119-9c24-ad4bbccec298\"]}",
          r.skillTargets = "[{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"2d463e46-d58d-3fa6-bbbc-6a2fe45bca39\",\"skillCode\":\"MS-FS08\",\"skillName\":\"conduct ICT code review\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"5800be2b-f27c-375e-855f-9026cc8a78ab\",\"skillCode\":\"MS-FS04\",\"skillName\":\"use query languages\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"c0f03a7a-6d96-36f0-816d-b0b88a4a6de6\",\"skillCode\":\"MS-FS07\",\"skillName\":\"perform software unit testing\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"8b9f0a45-8945-30d7-afab-39f64befc383\",\"skillCode\":\"MS-FS13\",\"skillName\":\"Enforce application authorization\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"b88375da-7c30-33fe-910b-aa40b1779faf\",\"skillCode\":\"MS-FS03\",\"skillName\":\"design application interfaces\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"b88375da-7c30-33fe-910b-aa40b1779faf\",\"skillCode\":\"MS-FS03\",\"skillName\":\"design application interfaces\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb\",\"skillCode\":\"MS-CORE01\",\"skillName\":\"Implement programs and scripts\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"c0f03a7a-6d96-36f0-816d-b0b88a4a6de6\",\"skillCode\":\"MS-FS07\",\"skillName\":\"perform software unit testing\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]}]",
          r.competencyIds = ['bc38aef2-3b40-3b54-b379-84001f37a1bc','bda74efc-57b0-3805-9a30-e9f314ecc0bd','4f78da20-51f7-322a-91b3-856c8cbb9b80','031ba8ca-74f6-394b-ad78-9cd48cb92b0c','919446f8-e76c-3316-89aa-fb7cad8ac68e','2df40d12-1cd5-3119-9c24-ad4bbccec298'],
          r.assignedExpertId = null;
    
MATCH (l:Level {id: 'af5a3c6a-5db4-3f4f-8e42-de42d40abfbb'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['31d80ac7-b3e1-3b73-b17c-0fe35f4a7929','0049442e-7e6c-3328-a35a-37d50f87f4f8'] DELETE rel;
MATCH (l:Level {id: 'af5a3c6a-5db4-3f4f-8e42-de42d40abfbb'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['ee5d9c78-ac73-32b2-9712-3fa261fe2eeb','3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a','fdfb8165-c2a1-3c77-87ea-e3cb6ea89252'] DELETE rel;

            MATCH (l:Level {id: 'af5a3c6a-5db4-3f4f-8e42-de42d40abfbb'}), (s:MicroSkill {id: 'ee5d9c78-ac73-32b2-9712-3fa261fe2eeb'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'af5a3c6a-5db4-3f4f-8e42-de42d40abfbb'}), (s:MicroSkill {id: '3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'af5a3c6a-5db4-3f4f-8e42-de42d40abfbb'}), (s:MicroSkill {id: 'fdfb8165-c2a1-3c77-87ea-e3cb6ea89252'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '59a547c2-7b79-3b73-882d-9fbd97f9bbe8'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['dada6663-779d-3a1f-aa15-add55ce8971a','94e1517a-9d1d-3958-87b1-fd9ba3bd1c5a'] DELETE rel;
MATCH (l:Level {id: '59a547c2-7b79-3b73-882d-9fbd97f9bbe8'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['fdfb8165-c2a1-3c77-87ea-e3cb6ea89252','baa51db6-8dea-3fcd-bebf-62c4ffafea54','ee5d9c78-ac73-32b2-9712-3fa261fe2eeb'] DELETE rel;

            MATCH (l:Level {id: '59a547c2-7b79-3b73-882d-9fbd97f9bbe8'}), (s:MicroSkill {id: 'fdfb8165-c2a1-3c77-87ea-e3cb6ea89252'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '59a547c2-7b79-3b73-882d-9fbd97f9bbe8'}), (s:MicroSkill {id: 'baa51db6-8dea-3fcd-bebf-62c4ffafea54'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '59a547c2-7b79-3b73-882d-9fbd97f9bbe8'}), (s:MicroSkill {id: 'ee5d9c78-ac73-32b2-9712-3fa261fe2eeb'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '8de08e3b-2448-3f03-ae17-d2249cf139f7'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['f5236b26-d524-3d69-902b-6111ab7dc857','56ec72f7-4d13-3bc3-b965-75639c02f228'] DELETE rel;
MATCH (l:Level {id: '8de08e3b-2448-3f03-ae17-d2249cf139f7'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['a6f7319a-083d-3b4c-bb69-107175c833ad','d7c02c30-0e06-360c-ac5e-2456dddcfded','b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6'] DELETE rel;

            MATCH (l:Level {id: '8de08e3b-2448-3f03-ae17-d2249cf139f7'}), (s:MicroSkill {id: 'a6f7319a-083d-3b4c-bb69-107175c833ad'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '8de08e3b-2448-3f03-ae17-d2249cf139f7'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '8de08e3b-2448-3f03-ae17-d2249cf139f7'}), (s:MicroSkill {id: 'b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

      MATCH (r:TargetRole {id: 'ecadefea-266f-3fc7-a9c9-1d38e8e2e986'})
      SET r.levelCompetencies = "{\"Senior\":[\"31d80ac7-b3e1-3b73-b17c-0fe35f4a7929\",\"0049442e-7e6c-3328-a35a-37d50f87f4f8\"],\"Middle\":[\"dada6663-779d-3a1f-aa15-add55ce8971a\",\"94e1517a-9d1d-3958-87b1-fd9ba3bd1c5a\"],\"Junior\":[\"f5236b26-d524-3d69-902b-6111ab7dc857\",\"56ec72f7-4d13-3bc3-b965-75639c02f228\"]}",
          r.skillTargets = "[{\"skillId\":\"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb\",\"skillCode\":\"MS-CORE01\",\"skillName\":\"Implement programs and scripts\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"3768722f-d4c3-3c6a-a3d7-4bdb3765ef5a\",\"skillCode\":\"MS-FS06\",\"skillName\":\"debug software\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"fdfb8165-c2a1-3c77-87ea-e3cb6ea89252\",\"skillCode\":\"MS-INF03\",\"skillName\":\"Automate infrastructure procedures\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"fdfb8165-c2a1-3c77-87ea-e3cb6ea89252\",\"skillCode\":\"MS-INF03\",\"skillName\":\"Automate infrastructure procedures\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"baa51db6-8dea-3fcd-bebf-62c4ffafea54\",\"skillCode\":\"MS-INF07\",\"skillName\":\"Verify backup and recovery procedures\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb\",\"skillCode\":\"MS-CORE01\",\"skillName\":\"Implement programs and scripts\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"a6f7319a-083d-3b4c-bb69-107175c833ad\",\"skillCode\":\"MS-CORE04\",\"skillName\":\"Deploy a controlled software release\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6\",\"skillCode\":\"MS-INF05\",\"skillName\":\"Monitor service health\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]}]",
          r.competencyIds = ['31d80ac7-b3e1-3b73-b17c-0fe35f4a7929','0049442e-7e6c-3328-a35a-37d50f87f4f8','dada6663-779d-3a1f-aa15-add55ce8971a','94e1517a-9d1d-3958-87b1-fd9ba3bd1c5a','f5236b26-d524-3d69-902b-6111ab7dc857','56ec72f7-4d13-3bc3-b965-75639c02f228'],
          r.assignedExpertId = null;
    
MATCH (l:Level {id: '12ec067a-8b82-33ce-aeb8-762853c49a13'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['ef8e7767-459b-3167-a5bc-3291d86e6a1a','cbd0749f-99af-3250-b4ea-957f7f548b3e'] DELETE rel;
MATCH (l:Level {id: '12ec067a-8b82-33ce-aeb8-762853c49a13'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['ce5d108b-bc44-36a0-8f47-4d70d4c8a7fd','2906c00a-0479-32e4-ba32-58b7a96cfd23','91659588-110f-3540-b191-c7198198c55c'] DELETE rel;

            MATCH (l:Level {id: '12ec067a-8b82-33ce-aeb8-762853c49a13'}), (s:MicroSkill {id: 'ce5d108b-bc44-36a0-8f47-4d70d4c8a7fd'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '12ec067a-8b82-33ce-aeb8-762853c49a13'}), (s:MicroSkill {id: '2906c00a-0479-32e4-ba32-58b7a96cfd23'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '12ec067a-8b82-33ce-aeb8-762853c49a13'}), (s:MicroSkill {id: '91659588-110f-3540-b191-c7198198c55c'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Senior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: '6b0637b2-c7f6-3bee-bd2f-e8592ea14b52'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['88f609fb-0e59-3418-b5f4-f829b3e72f0b','774ee3e5-eef9-31a0-970d-0c761dbb8ebf'] DELETE rel;
MATCH (l:Level {id: '6b0637b2-c7f6-3bee-bd2f-e8592ea14b52'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['fdfb8165-c2a1-3c77-87ea-e3cb6ea89252','baa51db6-8dea-3fcd-bebf-62c4ffafea54','4e18db6b-14e8-37c9-9cd3-af559a7fe946'] DELETE rel;

            MATCH (l:Level {id: '6b0637b2-c7f6-3bee-bd2f-e8592ea14b52'}), (s:MicroSkill {id: 'fdfb8165-c2a1-3c77-87ea-e3cb6ea89252'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '6b0637b2-c7f6-3bee-bd2f-e8592ea14b52'}), (s:MicroSkill {id: 'baa51db6-8dea-3fcd-bebf-62c4ffafea54'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: '6b0637b2-c7f6-3bee-bd2f-e8592ea14b52'}), (s:MicroSkill {id: '4e18db6b-14e8-37c9-9cd3-af559a7fe946'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Middle', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['INTERMEDIATE'], r.targetMastery = 0.7;
          
MATCH (l:Level {id: 'bdced29c-7404-3232-8b4c-06832d0b5f51'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN ['7bdd195e-9e15-3744-b212-822676e98241','c921b337-05ba-3fd3-b63e-1ddd5aeffb40'] DELETE rel;
MATCH (l:Level {id: 'bdced29c-7404-3232-8b4c-06832d0b5f51'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN ['b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6','d7c02c30-0e06-360c-ac5e-2456dddcfded','2906c00a-0479-32e4-ba32-58b7a96cfd23'] DELETE rel;

            MATCH (l:Level {id: 'bdced29c-7404-3232-8b4c-06832d0b5f51'}), (s:MicroSkill {id: 'b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'bdced29c-7404-3232-8b4c-06832d0b5f51'}), (s:MicroSkill {id: 'd7c02c30-0e06-360c-ac5e-2456dddcfded'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

            MATCH (l:Level {id: 'bdced29c-7404-3232-8b4c-06832d0b5f51'}), (s:MicroSkill {id: '2906c00a-0479-32e4-ba32-58b7a96cfd23'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = 'Junior', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ['FOUNDATION'], r.targetMastery = 0.7;
          

      MATCH (r:TargetRole {id: '47ba6651-1aba-30cb-847b-9e96b548e825'})
      SET r.levelCompetencies = "{\"Senior\":[\"ef8e7767-459b-3167-a5bc-3291d86e6a1a\",\"cbd0749f-99af-3250-b4ea-957f7f548b3e\"],\"Middle\":[\"88f609fb-0e59-3418-b5f4-f829b3e72f0b\",\"774ee3e5-eef9-31a0-970d-0c761dbb8ebf\"],\"Junior\":[\"7bdd195e-9e15-3744-b212-822676e98241\",\"c921b337-05ba-3fd3-b63e-1ddd5aeffb40\"]}",
          r.skillTargets = "[{\"skillId\":\"ce5d108b-bc44-36a0-8f47-4d70d4c8a7fd\",\"skillCode\":\"MS-SEC03\",\"skillName\":\"Configure identity and access controls\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"2906c00a-0479-32e4-ba32-58b7a96cfd23\",\"skillCode\":\"MS-SEC04\",\"skillName\":\"Investigate security alerts\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"91659588-110f-3540-b191-c7198198c55c\",\"skillCode\":\"MS-INF01\",\"skillName\":\"Configure and verify network connectivity\",\"level\":\"Senior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\",\"ADVANCED\"]},{\"skillId\":\"fdfb8165-c2a1-3c77-87ea-e3cb6ea89252\",\"skillCode\":\"MS-INF03\",\"skillName\":\"Automate infrastructure procedures\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"baa51db6-8dea-3fcd-bebf-62c4ffafea54\",\"skillCode\":\"MS-INF07\",\"skillName\":\"Verify backup and recovery procedures\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"4e18db6b-14e8-37c9-9cd3-af559a7fe946\",\"skillCode\":\"MS-ARC01\",\"skillName\":\"Model solution components and boundaries\",\"level\":\"Middle\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"INTERMEDIATE\"]},{\"skillId\":\"b3ee6e7c-5e30-3098-a3cf-29b4893fb0f6\",\"skillCode\":\"MS-INF05\",\"skillName\":\"Monitor service health\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"d7c02c30-0e06-360c-ac5e-2456dddcfded\",\"skillCode\":\"MS-CORE02\",\"skillName\":\"Manage source changes with version control\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]},{\"skillId\":\"2906c00a-0479-32e4-ba32-58b7a96cfd23\",\"skillCode\":\"MS-SEC04\",\"skillName\":\"Investigate security alerts\",\"level\":\"Junior\",\"threshold\":70,\"requiredKnowledgeLevels\":[\"FOUNDATION\"]}]",
          r.competencyIds = ['ef8e7767-459b-3167-a5bc-3291d86e6a1a','cbd0749f-99af-3250-b4ea-957f7f548b3e','88f609fb-0e59-3418-b5f4-f829b3e72f0b','774ee3e5-eef9-31a0-970d-0c761dbb8ebf','7bdd195e-9e15-3744-b212-822676e98241','c921b337-05ba-3fd3-b63e-1ddd5aeffb40'],
          r.assignedExpertId = null;
    