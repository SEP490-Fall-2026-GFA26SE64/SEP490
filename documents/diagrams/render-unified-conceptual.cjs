// node documents\diagrams\render-unified-conceptual.cjs <mermaid.min.js>
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..'), dir = path.join(__dirname, 'mermaid');
const source = fs.readFileSync(path.join(dir, 'cerd-unified.mmd'), 'utf8');
const nodes = [...source.matchAll(/^  (\w+)$/gm)].map(m => m[1]);
const edgePattern = /^\s+(\w+) ([|o}{.]+--[|o}{]+|[|o}{]+\.\.[|o}{]+) (\w+) : "([^"]+)"$/gm;
const edges = text => [...text.matchAll(edgePattern)].map(([, from, card, to, label]) => ({ from, card, to, label }));
const merged = edges(source);
assert.equal(nodes.length, 33); assert.equal(new Set(nodes).size, 33);
assert(merged.length > 0);
const aliases = { RoleMemberLevel: 'Level', MemberLevel: 'Level', SkillKnowledge: 'MicroSkill', ImmutableVersion: 'ImmutablePolicy' };
for (const name of ['cerd-01', 'cerd-02', 'cerd-03', 'cerd-04', 'cgraph-01']) {
  const original = edges(fs.readFileSync(path.join(dir, name + '.mmd'), 'utf8'));
  for (const e of original) {
    const from = aliases[e.from] || e.from, to = aliases[e.to] || e.to;
    assert(nodes.includes(from) && nodes.includes(to), 'Missing original entity');
    assert(merged.some(m => (m.from === from && m.to === to) || (m.from === to && m.to === from)), 'Missing original relationship ' + from + ' / ' + to);
  }
}
const report = fs.readFileSync(path.join(root, 'Review 2', 'Report3_Software Requirement Specification.md'), 'utf8');
const section = report.split('#### 3.1.5 Entity Relationship Diagram')[1].split('### 3.2 Organization Onboarding')[0];
const descriptions = section.split('**Entities Description**')[1];
const rows = descriptions.split(/\r?\n/).filter(line => /^\| \d+ \|/.test(line)).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
assert(descriptions.includes('| # | Entity | Description | Database |'));
assert.equal((descriptions.match(/^\| # \|/gm) || []).length, 1);
rows.forEach((row, i) => {
  assert.equal(row.length, 4); assert.equal(Number(row[0]), i + 1);
  assert(['PostgreSQL', 'Neo4j'].includes(row[3]));
});
assert.equal(rows.filter(row => row[3] === 'PostgreSQL').length, 26);
assert.equal(rows.filter(row => row[3] === 'Neo4j').length, 7);
assert.deepEqual(rows.map(row => row[1]).sort(), nodes.slice().sort());
assert.equal((section.match(/!\[/g) || []).length, 1);
const { chromium } = require(path.join(root, 'frontend', 'node_modules', '@playwright', 'test'));
(async () => {
  assert(process.argv[2], 'Provide a local Mermaid bundle');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<!doctype html><style>body{margin:0;background:white}svg{display:block;max-width:none!important}</style><div id="diagram"></div>');
    await page.addScriptTag({ path: path.resolve(process.argv[2]) });
    const result = await page.evaluate(async source => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', maxTextSize: 150000 });
      await mermaid.parse(source);
      const { svg } = await mermaid.render('unified_conceptual', source);
      document.querySelector('#diagram').innerHTML = svg; await document.fonts.ready;
      const el = document.querySelector('svg'), v = el.viewBox.baseVal;
      el.setAttribute('width', Math.ceil(v.width)); el.setAttribute('height', Math.ceil(v.height));
      const box = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
      const nodes = [...el.querySelectorAll('g.node')].map(e => ({ id: e.id, box: box(e) }));
      const labels = [...el.querySelectorAll('g.edgeLabel')].filter(e => e.textContent.trim()).map(e => ({ text: e.textContent.trim(), box: box(e) }));
      const frame = box(el);
      const clipped = [...nodes, ...labels].filter(e => e.box.x < frame.x || e.box.y < frame.y || e.box.x + e.box.w > frame.x + frame.w || e.box.y + e.box.h > frame.y + frame.h).length;
      const labelNodeCollisions = labels.flatMap(l => nodes.filter(n => overlap(l.box, n.box)).map(n => [l.text, n.id]));
      const labelLabelCollisions = labels.flatMap((l, i) => labels.slice(i + 1).filter(o => overlap(l.box, o.box)).map(o => [l.text, o.text]));
      const paths = [...el.querySelectorAll('path[data-edge="true"]')];
      const edgeNodeCollisions = paths.flatMap(edge => {
        const length = edge.getTotalLength(), samples = Math.ceil(length / 4), hits = new Set();
        for (let i = 0; i <= samples; i++) {
          const p = edge.getPointAtLength(length * i / samples), point = new DOMPoint(p.x, p.y).matrixTransform(edge.getScreenCTM());
          for (const n of nodes) if (point.x > n.box.x + 4 && point.x < n.box.x + n.box.w - 4 && point.y > n.box.y + 4 && point.y < n.box.y + n.box.h - 4) hits.add(n.id);
        }
        return [...hits].map(id => [edge.id, id]);
      });
      const serialized = new XMLSerializer().serializeToString(el), xml = new DOMParser().parseFromString(serialized, 'image/svg+xml');
      return { svg: serialized, nodes: nodes.length, labels: labels.length, width: Math.ceil(v.width), height: Math.ceil(v.height), clipped, labelNodeCollisions, labelLabelCollisions, edgeNodeCollisions, validXml: !xml.querySelector('parsererror') };
    }, source);
    assert.deepEqual(errors, []); assert.equal(result.nodes, nodes.length); assert.equal(result.labels, merged.length);
    assert.equal(result.validXml, true); assert.equal(result.clipped, 0);
    assert.deepEqual(result.labelNodeCollisions, []); assert.deepEqual(result.labelLabelCollisions, []);
    assert.deepEqual(result.edgeNodeCollisions, []);
    fs.writeFileSync(path.join(dir, 'cerd-unified.svg'), result.svg + '\n');
    await page.locator('svg').screenshot({ path: path.join(dir, 'cerd-unified.png') });
    const { svg, ...checks } = result;
    const receipt = { ...checks, postgresEntities: 26, neo4jEntities: 7, originalRelationshipCoverage: 'Passed', entityDescriptions: 'Passed', pageErrors: errors };
    fs.writeFileSync(path.join(dir, 'cerd-unified-checks.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
