const { execSync } = require('child_process');
const fs = require('fs');

function runCypher(query) {
  return execSync('docker exec -i adapt-learn-graph-dev-neo4j-1 cypher-shell -u neo4j -p local-only-neo4j', {
    input: query,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
}

function isUuid(val) {
  return !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

const orgId = 'a7ea5398-71d7-46e2-a704-d2d63e9d37af';

// 1. Gather all info in ONE query!
const megaQuery = `
MATCH (r:TargetRole {organizationId: '${orgId}'})
OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)
OPTIONAL MATCH (l)-[:HAS_COMPETENCY]->(c:Competency)
OPTIONAL MATCH (c)-[:HAS_SKILL]->(s:MicroSkill)
RETURN r.id AS roleId, r.name AS roleName, r.skillTargets AS skillTargets,
       l.id AS levelId, l.name AS levelName, l.rank AS levelRank,
       c.id AS compId, c.code AS compCode, c.name AS compName,
       s.id AS skillId, coalesce(s.code, s.sourceId, s.id) AS skillCode, s.name AS skillName;
`;

console.log('Querying graph structure...');
const rawRows = runCypher(megaQuery);
console.log('Raw output size:', rawRows.length);

// Parse CSV output
const lines = rawRows.split('\n');
const header = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
console.log('Header:', header);

// Group by role -> level -> comp -> skills
const roles = new Map();
const allSkills = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || !line.includes(',')) continue;
  // Parse CSV line properly
  const values = [];
  let inQuotes = false;
  let current = '';
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '"') {
      if (inQuotes && line[j+1] === '"') {
        current += '"';
        j++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));

  const [roleId, roleName, rawSkillTargets, levelId, levelName, levelRank, compId, compCode, compName, skillId, skillCode, skillName] = values.map(v => (v || '').trim().replace(/^"|"$/g, ''));
  if (!roleId) continue;

  if (skillId && skillCode) {
    allSkills.set(skillId, { id: skillId, code: skillCode, name: skillName || skillCode });
  }

  if (!roles.has(roleId)) {
    roles.set(roleId, {
      id: roleId,
      name: roleName,
      rawSkillTargets: rawSkillTargets || '[]',
      levels: new Map()
    });
  }

  const role = roles.get(roleId);
  if (!levelId) continue;

  if (!role.levels.has(levelId)) {
    role.levels.set(levelId, {
      id: levelId,
      name: levelName || 'Level',
      rank: parseInt(levelRank || '1', 10),
      competencies: new Map()
    });
  }

  const level = role.levels.get(levelId);
  if (!compId) continue;

  if (!level.competencies.has(compId)) {
    level.competencies.set(compId, {
      id: compId,
      code: compCode || compId,
      name: compName || compCode || compId,
      skills: []
    });
  }

  const comp = level.competencies.get(compId);
  if (skillId && !comp.skills.some(s => s.id === skillId)) {
    comp.skills.push({
      id: skillId,
      code: skillCode,
      name: skillName || skillCode
    });
  }
}

console.log('Parsed roles count:', roles.size);
console.log('Parsed skills count:', allSkills.size);

const importedRoleIds = [
  'fc9d2f2b-c9fe-3996-89b2-96df0ddf59a7', // Application Developer
  '94192c97-2ed3-34a9-a2a8-b9fa55ce68c0', // Application Integration Engineer
  '8efdff91-f8ff-3608-9be7-2500f7351643', // Developer
  'ecadefea-266f-3fc7-a9c9-1d38e8e2e986', // DevOps Engineer
  '47ba6651-1aba-30cb-847b-9e96b548e825'  // Infrastructure Engineer
];

const cypherStatements = [];

// Base cleanup
cypherStatements.push(`MATCH (s:MicroSkill) SET s.code = coalesce(s.code, s.sourceId, s.id);`);
cypherStatements.push(`MATCH (r:TargetRole) WHERE r.assignedExpertId = 'a0000000-0000-0000-0000-000000000002' SET r.assignedExpertId = null;`);

for (const [roleId, role] of roles.entries()) {
  if (importedRoleIds.includes(roleId)) {
    console.log(`Configuring imported role ${role.name} (${roleId})...`);
    const sortedLevels = Array.from(role.levels.values()).sort((a, b) => a.rank - b.rank);
    const levelComps = {};
    const allCompIds = new Set();
    const skillTargets = [];

    for (const lvl of sortedLevels) {
      const lvlName = lvl.name;
      const comps = Array.from(lvl.competencies.values());
      // Max 2 competencies per level
      const keptComps = comps.slice(0, 2);
      levelComps[lvlName] = keptComps.map(c => c.id);
      keptComps.forEach(c => allCompIds.add(c.id));

      // Remove extra HAS_COMPETENCY from this level
      const keptCompIdsStr = keptComps.map(c => `'${c.id}'`).join(',');
      if (keptCompIdsStr.length > 0) {
        cypherStatements.push(`MATCH (l:Level {id: '${lvl.id}'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN [${keptCompIdsStr}] DELETE rel;`);
      }

      // Max 3 micro-skills across kept comps for this level
      let levelSkillCount = 0;
      const levelSkillLimit = 3;
      const keptSkillIds = [];

      for (let i = 0; i < keptComps.length && levelSkillCount < levelSkillLimit; i++) {
        const c = keptComps[i];
        const maxForComp = (keptComps.length > 1 && i === 0) ? 2 : (levelSkillLimit - levelSkillCount);
        const chosen = c.skills.slice(0, maxForComp);
        for (const s of chosen) {
          if (levelSkillCount >= levelSkillLimit) break;
          levelSkillCount++;
          keptSkillIds.push(s.id);

          let knowledgeLevels = ['FOUNDATION'];
          if (lvlName.toLowerCase().includes('senior')) {
            knowledgeLevels = ['INTERMEDIATE', 'ADVANCED'];
          } else if (lvlName.toLowerCase().includes('middle')) {
            knowledgeLevels = ['INTERMEDIATE'];
          }

          skillTargets.push({
            skillId: s.id,
            skillCode: s.code,
            skillName: s.name,
            level: lvlName,
            threshold: 70,
            requiredKnowledgeLevels: knowledgeLevels
          });
        }
      }

      // Clean up and set REQUIRES_SKILL on this level
      const keptSkillIdsStr = keptSkillIds.map(id => `'${id}'`).join(',');
      if (keptSkillIdsStr.length > 0) {
        cypherStatements.push(`MATCH (l:Level {id: '${lvl.id}'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN [${keptSkillIdsStr}] DELETE rel;`);
        for (const sId of keptSkillIds) {
          let knowledgeArr = "['FOUNDATION']";
          if (lvlName.toLowerCase().includes('senior')) knowledgeArr = "['INTERMEDIATE', 'ADVANCED']";
          else if (lvlName.toLowerCase().includes('middle')) knowledgeArr = "['INTERMEDIATE']";
          cypherStatements.push(`
            MATCH (l:Level {id: '${lvl.id}'}), (s:MicroSkill {id: '${sId}'})
            MERGE (l)-[r:REQUIRES_SKILL]->(s)
            SET r.level = '${lvlName}', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ${knowledgeArr}, r.targetMastery = 0.7;
          `);
        }
      }
    }

    const levelCompsEscaped = JSON.stringify(levelComps).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const skillTargetsEscaped = JSON.stringify(skillTargets).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const compIdsList = Array.from(allCompIds).map(id => `'${id}'`).join(',');

    cypherStatements.push(`
      MATCH (r:TargetRole {id: '${roleId}'})
      SET r.levelCompetencies = "${levelCompsEscaped}",
          r.skillTargets = "${skillTargetsEscaped}",
          r.competencyIds = [${compIdsList}],
          r.assignedExpertId = null;
    `);
  } else {
    // Other role (e.g. asdf): replace raw UUIDs in skillTargets with real codes
    try {
      const targets = JSON.parse(role.rawSkillTargets);
      let modified = false;
      for (const t of targets) {
        const realSkill = allSkills.get(t.skillId);
        if (realSkill && realSkill.code && (isUuid(t.skillCode) || !t.skillCode)) {
          t.skillCode = realSkill.code;
          modified = true;
        }
        if (!t.requiredKnowledgeLevels || t.requiredKnowledgeLevels.length === 0) {
          const lvl = (t.level || '').toLowerCase();
          if (lvl.includes('senior')) t.requiredKnowledgeLevels = ['INTERMEDIATE', 'ADVANCED'];
          else if (lvl.includes('middle')) t.requiredKnowledgeLevels = ['INTERMEDIATE'];
          else t.requiredKnowledgeLevels = ['FOUNDATION'];
          modified = true;
        }
      }
      if (modified) {
        const cleanTargetsEscaped = JSON.stringify(targets).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        cypherStatements.push(`MATCH (r:TargetRole {id: '${roleId}'}) SET r.skillTargets = "${cleanTargetsEscaped}";`);
        console.log(`Will update skillCodes and knowledge for role ${role.name} (${roleId})`);
      }
    } catch (e) {
      console.warn(`Could not parse skillTargets for ${role.name}:`, e.message);
    }
  }
}

const cypherFileContent = cypherStatements.join('\n');
fs.writeFileSync('scratch/batch_update.cypher', cypherFileContent, 'utf8');
console.log(`Generated ${cypherStatements.length} Cypher statements in scratch/batch_update.cypher`);

// Execute the batch script in Neo4j in ONE single invocation!
console.log('Executing batch Cypher script in Neo4j...');
const execResult = runCypher(cypherFileContent);
console.log('Execution finished successfully!');
