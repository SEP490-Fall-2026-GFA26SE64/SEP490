// node documents\diagrams\render-employee-screen-flow.cjs <mermaid.min.js>
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const dir = path.join(__dirname, 'mermaid');
const source = fs.readFileSync(path.join(dir, 'screen-flow-employee.mmd'), 'utf8');
const nodes = [...source.matchAll(/^\s+(EMP_\w+)(\[|\()"([^"]+)"[\])]$/gm)];
const edges = [...source.matchAll(/^\s+(EMP_\w+)\s+(-->|-\.->)(?:\|"([^"]*)"\|)?\s+(EMP_\w+)$/gm)];
assert.equal(nodes.length, 20);
assert.equal(new Set(nodes.map(n => n[1])).size, nodes.length);
for (const [, from, , , to] of edges) {
  assert(nodes.some(n => n[1] === from), 'Unknown source ' + from);
  assert(nodes.some(n => n[1] === to), 'Unknown destination ' + to);
}
const report = fs.readFileSync(path.join(root, 'Review 2', 'Report3_Software Requirement Specification.md'), 'utf8');
const descriptions = report.split('#### 3.1.2 Screen Descriptions')[1].split('#### 3.1.3 Screen Authorization')[0];
const authorization = report.split('#### 3.1.3 Screen Authorization')[1].split('#### 3.1.4')[0];
for (const [, , , name] of nodes) {
  assert(descriptions.split(/\r?\n/).some(line => /^\| \d+ \|/.test(line) && line.split('|')[3].trim() === name), 'Missing description: ' + name);
  const row = authorization.split(/\r?\n/).find(line => line.startsWith('| **' + name + '** |'));
  assert(row && row.split('|')[7].trim() === 'X', 'Missing Employee authorization: ' + name);
}
const { chromium } = require(path.join(root, 'frontend', 'node_modules', '@playwright', 'test'));

(async () => {
  assert(process.argv[2], 'Provide a local Mermaid bundle');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 2200, height: 1400 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<!doctype html><style>body{margin:0;background:white}svg{display:block;max-width:none!important}</style><div id="diagram"></div>');
    await page.addScriptTag({ path: path.resolve(process.argv[2]) });
    const result = await page.evaluate(async source => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      await mermaid.parse(source);
      const { svg } = await mermaid.render('employee_screen_flow', source);
      document.querySelector('#diagram').innerHTML = svg;
      await document.fonts.ready;
      const el = document.querySelector('svg'), view = el.viewBox.baseVal;
      el.setAttribute('width', Math.ceil(view.width));
      el.setAttribute('height', Math.ceil(view.height));
      const box = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
      const nodes = [...el.querySelectorAll('g.node')].map(e => ({ id: e.id, box: box(e) }));
      const labels = [...el.querySelectorAll('g.edgeLabel')].filter(e => e.textContent.trim()).map(e => ({ text: e.textContent.trim(), box: box(e) }));
      const frame = box(el);
      const clipped = [...nodes, ...labels].filter(e => e.box.x < frame.x || e.box.y < frame.y || e.box.x + e.box.w > frame.x + frame.w || e.box.y + e.box.h > frame.y + frame.h);
      const labelNodeCollisions = labels.flatMap(l => nodes.filter(n => overlap(l.box, n.box)).map(n => [l.text, n.id]));
      const labelLabelCollisions = labels.flatMap((l, i) => labels.slice(i + 1).filter(o => overlap(l.box, o.box)).map(o => [l.text, o.text]));
      const edgeNodeCollisions = [...el.querySelectorAll('path[data-edge="true"]')].flatMap(edge => {
        const length = edge.getTotalLength(), count = Math.ceil(length / 3), hits = new Set();
        for (let i = 0; i <= count; i++) {
          const point = edge.getPointAtLength(length * i / count), p = new DOMPoint(point.x, point.y).matrixTransform(edge.getScreenCTM());
          for (const n of nodes) if (p.x > n.box.x + 3 && p.x < n.box.x + n.box.w - 3 && p.y > n.box.y + 3 && p.y < n.box.y + n.box.h - 3) hits.add(n.id);
        }
        return [...hits].map(id => [edge.id, id]);
      });
      const xml = new DOMParser().parseFromString(el.outerHTML, 'image/svg+xml');
      return { svg: new XMLSerializer().serializeToString(el), width: Math.ceil(view.width), height: Math.ceil(view.height), nodes: nodes.length, edges: el.querySelectorAll('path[data-edge="true"]').length, edgeLabels: labels.length, clipped: clipped.length, labelNodeCollisions, labelLabelCollisions, edgeNodeCollisions, validXml: !xml.querySelector('parsererror') };
    }, source);
    assert.deepEqual(errors, []);
    assert.equal(result.nodes, nodes.length);
    assert.equal(result.edges, edges.length);
    assert.equal(result.edgeLabels, edges.length);
    assert.equal(result.validXml, true);
    assert.equal(result.clipped, 0);
    assert.deepEqual(result.labelNodeCollisions, []);
    assert.deepEqual(result.labelLabelCollisions, []);
    assert.deepEqual(result.edgeNodeCollisions, []);
    fs.writeFileSync(path.join(dir, 'screen-flow-employee.svg'), result.svg + '\n');
    await page.locator('svg').screenshot({ path: path.join(dir, 'screen-flow-employee.png') });
    const { svg, ...checks } = result;
    console.log(JSON.stringify({ ...checks, descriptionsAndAuthorization: 'Passed', pageErrors: errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
