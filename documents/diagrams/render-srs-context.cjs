// node documents\diagrams\render-srs-context.cjs <mermaid.min.js>
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const dir = path.join(__dirname, 'mermaid');
const source = fs.readFileSync(path.join(dir, 'srs-context.mmd'), 'utf8');
const left = ['Guest', 'SystemAdmin', 'Manager', 'Email'];
const right = ['Expert', 'PlatformAdmin', 'Employee', 'PayOS'];
const nodes = [...source.matchAll(/^\s+(\w+)(\[|\(\()"/gm)];
const edges = [...source.matchAll(/^\s+(\w+) -->\|"([^"]+)"\| (\w+)$/gm)].map(([, from, label, to]) => ({ from, label, to }));
assert.deepEqual(nodes.map(n => n[1]).sort(), ['System', ...left, ...right].sort());
assert.equal(nodes.filter(n => n[2] === '((').length, 1);
assert.equal(nodes.find(n => n[2] === '((')[1], 'System');
assert.equal(edges.length, 104);
assert(!/occupation|ROI|training cost|monetary benefit/i.test(source), 'Excluded terminology or financial flows remain in context');
assert(source.includes('Job Position details') && source.includes('Expert Job Position assignments'));
assert.equal(new Set(edges.map(e => [e.from, e.label, e.to].join('|'))).size, edges.length);
for (const e of edges) {
  assert((e.from === 'System') !== (e.to === 'System'), 'A context flow must cross the product boundary');
  assert([...left, ...right].includes(e.from === 'System' ? e.to : e.from), 'Unknown external entity');
}
const flowCount = ids => edges.filter(e => ids.includes(e.from) || ids.includes(e.to)).length;
assert.equal(flowCount(left), 47);
assert.equal(flowCount(right), 57);
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
    const result = await page.evaluate(async ({ source, left, right }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', maxTextSize: 150000 });
      await mermaid.parse(source);
      const { svg } = await mermaid.render('srs_context', source);
      document.querySelector('#diagram').innerHTML = svg;
      await document.fonts.ready;
      const el = document.querySelector('svg'), view = el.viewBox.baseVal;
      el.setAttribute('width', Math.ceil(view.width)); el.setAttribute('height', Math.ceil(view.height));
      const box = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
      const nodes = [...el.querySelectorAll('g.node')].map(e => ({ id: e.id.match(/flowchart-(\w+)-\d+$/)[1], box: box(e), circle: Boolean(e.querySelector('circle')) }));
      const system = nodes.find(n => n.id === 'System'), cx = system.box.x + system.box.w / 2, cy = system.box.y + system.box.h / 2, radius = system.box.w / 2;
      const labels = [...el.querySelectorAll('g.edgeLabel')].map(e => ({ text: e.textContent.trim(), box: box(e) }));
      const frame = box(el), paths = [...el.querySelectorAll('path[data-edge="true"]')];
      const clipped = [...nodes, ...labels].filter(e => e.box.x < frame.x || e.box.y < frame.y || e.box.x + e.box.w > frame.x + frame.w || e.box.y + e.box.h > frame.y + frame.h);
      const labelNodeCollisions = labels.flatMap(l => nodes.filter(n => n.circle ? Math.hypot(Math.max(n.box.x - l.box.x - l.box.w, 0, l.box.x - n.box.x - n.box.w), Math.max(n.box.y - l.box.y - l.box.h, 0, l.box.y - n.box.y - n.box.h)) === 0 && Math.hypot(Math.max(l.box.x, Math.min(cx, l.box.x + l.box.w)) - cx, Math.max(l.box.y, Math.min(cy, l.box.y + l.box.h)) - cy) < radius - 2 : overlap(l.box, n.box)).map(n => [l.text, n.id]));
      const labelLabelCollisions = labels.flatMap((l, i) => labels.slice(i + 1).filter(o => overlap(l.box, o.box)).map(o => [l.text, o.text]));
      const point = (edge, at) => { const p = edge.getPointAtLength(at); return new DOMPoint(p.x, p.y).matrixTransform(edge.getScreenCTM()); };
      const edgeNodeCollisions = paths.flatMap(edge => {
        const length = edge.getTotalLength(), samples = Math.ceil(length / 4), hits = new Set();
        for (let i = 0; i <= samples; i++) {
          const p = point(edge, length * i / samples);
          for (const n of nodes) {
            const inside = n.circle ? Math.hypot(p.x - cx, p.y - cy) < radius - 4 : p.x > n.box.x + 4 && p.x < n.box.x + n.box.w - 4 && p.y > n.box.y + 4 && p.y < n.box.y + n.box.h - 4;
            if (inside) hits.add(n.id);
          }
        }
        return [...hits].map(id => [edge.id, id]);
      });
      const ports = paths.map(edge => {
        const candidates = [point(edge, 0), point(edge, edge.getTotalLength())];
        candidates.sort((a, b) => Math.abs(Math.hypot(a.x - cx, a.y - cy) - radius) - Math.abs(Math.hypot(b.x - cx, b.y - cy) - radius));
        const p = candidates[0], distance = Math.hypot(p.x - cx, p.y - cy);
        return { x: cx + (p.x - cx) * radius / distance, y: cy + (p.y - cy) * radius / distance };
      });
      let minimumCirclePortGap = Infinity, coincidentCirclePorts = 0;
      ports.forEach((p, i) => ports.slice(i + 1).forEach(q => { const gap = Math.hypot(p.x - q.x, p.y - q.y); minimumCirclePortGap = Math.min(minimumCirclePortGap, gap); if (gap < 0.5) coincidentCirclePorts++; }));
      const misplacedEntities = [...left.filter(id => nodes.find(n => n.id === id).box.x + nodes.find(n => n.id === id).box.w / 2 >= cx), ...right.filter(id => nodes.find(n => n.id === id).box.x + nodes.find(n => n.id === id).box.w / 2 <= cx)];
      const serialized = new XMLSerializer().serializeToString(el);
      const xml = new DOMParser().parseFromString(serialized, 'image/svg+xml');
      return { svg: serialized, width: Math.ceil(view.width), height: Math.ceil(view.height), nodes: nodes.length, circles: nodes.filter(n => n.circle).length, edges: paths.length, edgeLabels: labels.length, clipped: clipped.length, labelNodeCollisions, labelLabelCollisions, edgeNodeCollisions, misplacedEntities, minimumCirclePortGap: Math.round(minimumCirclePortGap * 100) / 100, coincidentCirclePorts, validXml: !xml.querySelector('parsererror') };
    }, { source, left, right });
    assert.deepEqual(errors, []);
    assert.equal(result.nodes, 9); assert.equal(result.circles, 1);
    assert.equal(result.edges, edges.length); assert.equal(result.edgeLabels, edges.length);
    assert.equal(result.validXml, true); assert.equal(result.clipped, 0);
    for (const name of ['labelNodeCollisions', 'labelLabelCollisions', 'edgeNodeCollisions', 'misplacedEntities']) assert.deepEqual(result[name], [], name);
    assert.equal(result.coincidentCirclePorts, 0);
    fs.writeFileSync(path.join(dir, 'srs-context.svg'), result.svg + '\n');
    await page.locator('svg').screenshot({ path: path.join(dir, 'srs-context.png') });
    const { svg, ...checks } = result;
    const receipt = { ...checks, externalEntities: 8, humanActors: 6, providers: 2, leftFlows: flowCount(left), rightFlows: flowCount(right), pageErrors: errors };
    fs.writeFileSync(path.join(dir, 'srs-context-checks.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
