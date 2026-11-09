const { execSync } = require('child_process');

function runCypher(query) {
  return execSync('docker exec -i adapt-learn-graph-dev-neo4j-1 cypher-shell -u neo4j -p local-only-neo4j', {
    input: query,
    encoding: 'utf8'
  });
}

// Map of skillId -> code
const codeMap = {
  '4e18db6b-14e8-37c9-9cd3-af559a7fe946': 'MS-ARC01',
  '7b34dda7-5cbf-3dbb-aa1e-199d36777d76': 'MS-ARC04',
  'ee5d9c78-ac73-32b2-9712-3fa261fe2eeb': 'MS-CORE01',
  '0d829d91-114d-36a7-b443-34b2562e51e4': 'MS-FS14',
  '5800be2b-f27c-375e-855f-9026cc8a78ab': 'MS-FS04'
};

const updatedList = [
  {"skillId":"4e18db6b-14e8-37c9-9cd3-af559a7fe946","skillCode":"MS-ARC01","skillName":"Model solution components and boundaries","level":"Senior","requiredKnowledgeLevels":["INTERMEDIATE","ADVANCED"]},
  {"skillId":"4e18db6b-14e8-37c9-9cd3-af559a7fe946","skillCode":"MS-ARC01","skillName":"Model solution components and boundaries","level":"Middle","requiredKnowledgeLevels":["INTERMEDIATE"]},
  {"skillId":"4e18db6b-14e8-37c9-9cd3-af559a7fe946","skillCode":"MS-ARC01","skillName":"Model solution components and boundaries","level":"Junior","requiredKnowledgeLevels":["FOUNDATION"]},
  {"skillId":"7b34dda7-5cbf-3dbb-aa1e-199d36777d76","skillCode":"MS-ARC04","skillName":"Specify measurable service quality targets","level":"Senior","requiredKnowledgeLevels":["INTERMEDIATE","ADVANCED"]},
  {"skillId":"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb","skillCode":"MS-CORE01","skillName":"Implement programs and scripts","level":"Middle","requiredKnowledgeLevels":["INTERMEDIATE"]},
  {"skillId":"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb","skillCode":"MS-CORE01","skillName":"Implement programs and scripts","level":"Senior","requiredKnowledgeLevels":["INTERMEDIATE","ADVANCED"]},
  {"skillId":"ee5d9c78-ac73-32b2-9712-3fa261fe2eeb","skillCode":"MS-CORE01","skillName":"Implement programs and scripts","level":"Junior","requiredKnowledgeLevels":["FOUNDATION"]},
  {"skillId":"0d829d91-114d-36a7-b443-34b2562e51e4","skillCode":"MS-FS14","skillName":"Use database transactions","level":"Rank 4","requiredKnowledgeLevels":["FOUNDATION"]},
  {"skillId":"5800be2b-f27c-375e-855f-9026cc8a78ab","skillCode":"MS-FS04","skillName":"use query languages","level":"Rank 4","requiredKnowledgeLevels":["INTERMEDIATE"]}
];

const cleanJson = JSON.stringify(updatedList).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

runCypher(`
  MATCH (r:TargetRole)
  WHERE r.id IN ['af598d6d-7a90-4cc6-9a9e-a41f4b9eda7a', '1dd06e50-f090-4b1f-84ee-c10b2f05c315']
  SET r.skillTargets = "${cleanJson}";
`);

console.log('Successfully updated asdf role skill targets with readable codes!');

