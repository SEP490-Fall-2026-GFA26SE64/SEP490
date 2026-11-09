const { execSync } = require('child_process');
const fs = require('fs');

function runCypher(query) {
  return execSync('docker exec -i adapt-learn-graph-dev-neo4j-1 cypher-shell -u neo4j -p local-only-neo4j', {
    input: query,
    encoding: 'utf8'
  });
}

function isUuid(val) {
  return !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

const orgId = 'a7ea5398-71d7-46e2-a704-d2d63e9d37af';

// 1. Build skill map
const skillQuery = `MATCH (s:MicroSkill {organizationId: '${orgId}'}) RETURN s.id AS id, s.code AS code, s.name AS name;`;
const skillOutput = runCypher(skillQuery);
const skillMap = new Map();
for (const line of skillOutput.split('\n')) {
  if (!line.includes(',') || line.startsWith('id,')) continue;
  const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  if (parts.length >= 2 && parts[0]) {
    skillMap.set(parts[0], { id: parts[0], code: parts[1] || parts[0], name: parts[2] || '' });
  }
}
console.log('Org micro-skills count:', skillMap.size);

// Also index platform skills if any
const platQuery = `MATCH (s:MicroSkill) RETURN s.id AS id, s.code AS code, s.name AS name;`;
for (const line of runCypher(platQuery).split('\n')) {
  if (!line.includes(',') || line.startsWith('id,')) continue;
  const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  if (parts.length >= 2 && parts[0] && !skillMap.has(parts[0])) {
    skillMap.set(parts[0], { id: parts[0], code: parts[1] || parts[0], name: parts[2] || '' });
  }
}

// 2. The 5 imported template roles to reshape to 2 comps / 3 skills per level
const importedRoleIds = [
  'fc9d2f2b-c9fe-3996-89b2-96df0ddf59a7', // Application Developer
  '94192c97-2ed3-34a9-a2a8-b9fa55ce68c0', // Application Integration Engineer
  '8efdff91-f8ff-3608-9be7-2500f7351643', // Developer
  'ecadefea-266f-3fc7-a9c9-1d38e8e2e986', // DevOps Engineer
  '47ba6651-1aba-30cb-847b-9e96b548e825'  // Infrastructure Engineer
];

for (const roleId of importedRoleIds) {
  console.log(`Processing imported role ${roleId}...`);
  // Get levels
  const levelsOut = runCypher(`MATCH (r:TargetRole {id: '${roleId}'})-[:HAS_LEVEL]->(l:Level) RETURN l.id AS id, l.name AS name ORDER BY l.rank;`);
  const levels = [];
  for (const line of levelsOut.split('\n')) {
    if (!line.includes(',') || line.startsWith('id,')) continue;
    const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    if (parts[0]) levels.push({ id: parts[0], name: parts[1] || 'Level' });
  }

  const levelComps = {};
  const allCompIds = new Set();
  const skillTargets = [];
  const retainedCompIds = new Set();
  const retainedSkillIds = new Set();

  for (const lvl of levels) {
    const lvlName = lvl.name;
    // Get competencies attached to this level
    const compOut = runCypher(`MATCH (l:Level {id: '${lvl.id}'})-[:HAS_COMPETENCY]->(c:Competency) RETURN c.id AS id, c.code AS code, c.name AS name;`);
    const comps = [];
    for (const line of compOut.split('\n')) {
      if (!line.includes(',') || line.startsWith('id,')) continue;
      const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts[0]) comps.push({ id: parts[0], code: parts[1] || parts[0], name: parts[2] || '' });
    }

    // Limit to max 2 competencies per level
    const keptComps = comps.slice(0, 2);
    levelComps[lvlName] = keptComps.map(c => c.id);
    keptComps.forEach(c => {
      allCompIds.add(c.id);
      retainedCompIds.add(c.id);
    });

    // Remove HAS_COMPETENCY to extra comps from this level
    const keptCompIdsStr = keptComps.map(c => `'${c.id}'`).join(',');
    if (keptCompIdsStr.length > 0) {
      runCypher(`MATCH (l:Level {id: '${lvl.id}'})-[rel:HAS_COMPETENCY]->(c:Competency) WHERE NOT c.id IN [${keptCompIdsStr}] DELETE rel;`);
    }

    // Skills: max 3 micro-skills across keptComps
    let levelSkillCount = 0;
    const levelSkillLimit = 3;
    const keptLevelSkills = [];

    for (let i = 0; i < keptComps.length && levelSkillCount < levelSkillLimit; i++) {
      const c = keptComps[i];
      const skillOut = runCypher(`MATCH (c:Competency {id: '${c.id}'})-[:HAS_SKILL]->(s:MicroSkill) RETURN s.id AS id, s.code AS code, s.name AS name;`);
      const cSkills = [];
      for (const line of skillOut.split('\n')) {
        if (!line.includes(',') || line.startsWith('id,')) continue;
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts[0]) cSkills.push({ id: parts[0], code: parts[1] || parts[0], name: parts[2] || '' });
      }

      const maxForComp = (keptComps.length > 1 && i === 0) ? 2 : (levelSkillLimit - levelSkillCount);
      const chosen = cSkills.slice(0, maxForComp);
      for (const s of chosen) {
        if (levelSkillCount >= levelSkillLimit) break;
        levelSkillCount++;
        retainedSkillIds.add(s.id);
        keptLevelSkills.push(s);

        const realSkill = skillMap.get(s.id) || s;
        let knowledgeLevels = ['FOUNDATION'];
        if (lvlName.toLowerCase().includes('senior')) {
          knowledgeLevels = ['INTERMEDIATE', 'ADVANCED'];
        } else if (lvlName.toLowerCase().includes('middle')) {
          knowledgeLevels = ['INTERMEDIATE'];
        }

        skillTargets.push({
          skillId: realSkill.id,
          skillCode: realSkill.code,
          skillName: realSkill.name,
          level: lvlName,
          threshold: 70,
          requiredKnowledgeLevels: knowledgeLevels
        });
      }
    }

    // Clean up REQUIRES_SKILL on this level
    const keptSkillIdsStr = keptLevelSkills.map(s => `'${s.id}'`).join(',');
    if (keptSkillIdsStr.length > 0) {
      runCypher(`MATCH (l:Level {id: '${lvl.id}'})-[rel:REQUIRES_SKILL]->(s:MicroSkill) WHERE NOT s.id IN [${keptSkillIdsStr}] DELETE rel;`);
      // Ensure REQUIRES_SKILL exists for kept skills
      for (const s of keptLevelSkills) {
        let knowledgeArr = "['FOUNDATION']";
        if (lvlName.toLowerCase().includes('senior')) knowledgeArr = "['INTERMEDIATE', 'ADVANCED']";
        else if (lvlName.toLowerCase().includes('middle')) knowledgeArr = "['INTERMEDIATE']";
        runCypher(`
          MATCH (l:Level {id: '${lvl.id}'}), (s:MicroSkill {id: '${s.id}'})
          MERGE (l)-[r:REQUIRES_SKILL]->(s)
          SET r.level = '${lvlName}', r.status = 'ACTIVE', r.requiredKnowledgeLevels = ${knowledgeArr}, r.targetMastery = 0.7;
        `);
      }
    }
  }

  // Update TargetRole node
  const levelCompsJson = JSON.stringify(levelComps).replace(/"/g, '\\"');
  const skillTargetsJson = JSON.stringify(skillTargets).replace(/"/g, '\\"');
  const compIdsList = Array.from(allCompIds).map(id => `'${id}'`).join(',');

  runCypher(`
    MATCH (r:TargetRole {id: '${roleId}'})
    SET r.levelCompetencies = "${levelCompsJson}",
        r.skillTargets = "${skillTargetsJson}",
        r.competencyIds = [${compIdsList}],
        r.assignedExpertId = NULL;
  `);
  console.log(`Role ${roleId} updated: ${Object.keys(levelComps).length} levels, ${skillTargets.length} total skill targets.`);
}

// 3. Fix all other roles (e.g. asdf) where skillCode was raw UUID
const allRolesOut = runCypher(`MATCH (r:TargetRole {organizationId: '${orgId}'}) RETURN r.id AS id, r.name AS name, r.skillTargets AS skillTargets;`);
for (const line of allRolesOut.split('\n')) {
  if (!line.includes(',') || line.startsWith('id,')) continue;
  const firstComma = line.indexOf(',');
  const secondComma = line.indexOf(',', firstComma + 1);
  if (firstComma < 0 || secondComma < 0) continue;
  const id = line.substring(0, firstComma).trim().replace(/^"|"$/g, '');
  const name = line.substring(firstComma + 1, secondComma).trim().replace(/^"|"$/g, '');
  const rawSkillTargets = line.substring(secondComma + 1).trim().replace(/^"|"$/g, '').replace(/""/g, '"');

  if (importedRoleIds.includes(id)) continue;
  if (!rawSkillTargets || rawSkillTargets === '[]') continue;

  try {
    const targets = JSON.parse(rawSkillTargets);
    let modified = false;
    for (const t of targets) {
      const realSkill = skillMap.get(t.skillId);
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
      const cleanJson = JSON.stringify(targets).replace(/"/g, '\\"');
      runCypher(`MATCH (r:TargetRole {id: '${id}'}) SET r.skillTargets = "${cleanJson}";`);
      console.log(`Cleaned skillCodes and knowledge for role ${name} (${id})`);
    }
  } catch (err) {
    console.error(`Failed to parse skillTargets for role ${id}:`, err.message);
  }
}

console.log('Starter catalog fix completed successfully!');
