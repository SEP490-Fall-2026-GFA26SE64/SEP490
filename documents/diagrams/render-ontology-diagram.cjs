// node documents\diagrams\render-ontology-diagram.cjs <mermaid.min.js> [graph-01|cgraph-01]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const dir = path.join(__dirname, 'mermaid');
const diagramId = process.argv[3] || 'graph-01';
assert(['graph-01', 'cgraph-01'].includes(diagramId), 'Unsupported ontology diagram');
const conceptual = diagramId === 'cgraph-01';
const source = fs.readFileSync(path.join(dir, diagramId + '.mmd'), 'utf8');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'documents', 'dataset', 'import', 'ontology_seed-v012.json'), 'utf8'));
const labels = {
  JobPositions: 'JobPosition', TargetRoles: 'TargetRole', Levels: 'Level',
  Competencies: 'Competency', MicroSkills: 'MicroSkill', LearningModules: 'LearningModule',
};
const metadata = new Set(['version', 'status', 'reviewStatus', 'reviewedBy', 'reviewedAt']);
const exportOnly = new Set(['jobPositionId', 'targetRoleId', 'levelId']);
const entities = conceptual
  ? [...source.matchAll(/^\s+(SDD_GRAPH_01_\w+)\["(\w+)"\]$/gm)]
  : [...source.matchAll(/^\s+(SDD_GRAPH_01_\w+)\["(\w+)"\] \{([\s\S]*?)^\s*}/gm)];
assert.equal(entities.length, 6);
for (const [section, label] of Object.entries(labels)) {
  const entity = entities.find(e => e[2] === label);
  assert(entity, 'Missing label ' + label);
  if (conceptual) continue;
  const fields = [...entity[3].matchAll(/^\s+\w+ (\w+)/gm)].map(m => m[1]).sort();
  const expected = [...new Set(seed[section].flatMap(row => Object.keys(row)))].filter(k => !metadata.has(k) && !exportOnly.has(k)).sort();
  assert.deepEqual(fields, expected, label + ' graph properties');
}
const edges = [...source.matchAll(/^\s+SDD_GRAPH_01_(\w+) ([|o}{-]+) SDD_GRAPH_01_(\w+) : "(\w+)"$/gm)];
assert.equal(edges.length, 7);
assert.deepEqual(edges.map(e => e[4]).sort(), [...new Set(seed.relationships.map(e => e.type))].sort());
assert(source.includes('SDD_GRAPH_01_LearningModule }o--|| SDD_GRAPH_01_MicroSkill : "TEACHES"'));
assert(!/Occupation|teachingFocus|difficultyLevel|job positionId/.test(source));
if (conceptual) assert(!/\]\s*\{|\bPK\b|\bFK\b/.test(source.split('erDiagram')[1]), 'Conceptual view must not contain attributes or keys');
const taught = seed.relationships.filter(e => e.type === 'TEACHES');
assert.equal(taught.length, seed.LearningModules.length);
assert(seed.LearningModules.every(module => taught.filter(e => e.fromId === module.id).length === 1));
const { chromium } = require(path.join(root, 'frontend', 'node_modules', '@playwright', 'test'));

(async () => {
  assert(process.argv[2], 'Provide the local Mermaid bundle path');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<!doctype html><style>body{margin:0;background:white}svg{display:block;max-width:none!important}</style><div id="diagram"></div>');
    await page.addScriptTag({ path: path.resolve(process.argv[2]) });
    const result = await page.evaluate(async source => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
      await mermaid.parse(source);
      const { svg } = await mermaid.render('ontology_graph_01', source);
      document.querySelector('#diagram').innerHTML = svg;
      await document.fonts.ready;
      const el = document.querySelector('svg'), v = el.viewBox.baseVal;
      el.setAttribute('width', Math.ceil(v.width));
      el.setAttribute('height', Math.ceil(v.height));
      const box = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
      const nodes = [...el.querySelectorAll('g.node')].map(e => ({ id: e.id, box: box(e) }));
      const labels = [...el.querySelectorAll('g.edgeLabel')].filter(e => e.textContent.trim()).map(e => ({ text: e.textContent.trim(), box: box(e) }));
      const labelNodeCollisions = labels.flatMap(l => nodes.filter(n => overlap(l.box, n.box)).map(n => [l.text, n.id]));
      const labelLabelCollisions = labels.flatMap((l, i) => labels.slice(i + 1).filter(o => overlap(l.box, o.box)).map(o => [l.text, o.text]));
      const frame = box(el);
      const clippedLabels = [...nodes, ...labels].filter(e => e.box.x < frame.x || e.box.y < frame.y || e.box.x + e.box.w > frame.x + frame.w || e.box.y + e.box.h > frame.y + frame.h).length;
      const parsed = new DOMParser().parseFromString(el.outerHTML, 'image/svg+xml');
      return { svg: new XMLSerializer().serializeToString(el), width: Math.ceil(v.width), height: Math.ceil(v.height), nodes: nodes.length, labels: labels.length, labelNodeCollisions, labelLabelCollisions, clippedLabels, validXml: !parsed.querySelector('parsererror') };
    }, source);
    assert.deepEqual(errors, []);
    assert.equal(result.nodes, 6);
    assert.equal(result.labels, 7);
    assert.equal(result.validXml, true);
    assert.equal(result.clippedLabels, 0);
    assert.deepEqual(result.labelNodeCollisions, []);
    assert.deepEqual(result.labelLabelCollisions, []);
    fs.writeFileSync(path.join(dir, diagramId + '.svg'), result.svg + '\n');
    await page.locator('svg').screenshot({ path: path.join(dir, diagramId + '.png') });
    const { svg, ...checks } = result;
    console.log(JSON.stringify({ diagramId, ...checks, graphProperties: conceptual ? 'Conceptual - no attributes or keys' : 'Passed', singleSkillMapping: 'Passed', pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
