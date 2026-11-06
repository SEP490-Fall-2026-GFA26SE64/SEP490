// node documents\diagrams\render-package-overviews.cjs [chrome.exe]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const dir = path.join(__dirname, 'mermaid');
const { chromium } = require(path.join(root, 'frontend', 'node_modules', '@playwright', 'test'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const layouts = {
  backend: {
    width: 1510, height: 760,
    nodes: {
      Apis: [60, 280, 200, 90], Services: [410, 280, 220, 90],
      Repository: [780, 280, 240, 90], Entities: [1190, 260, 260, 250],
      EntityDomain: [1220, 350, 200, 90],
      Dtos: [410, 70, 220, 90], Config: [410, 570, 220, 90],
      Jwt: [780, 570, 240, 90],
    },
    routes: {
      'Apis>Services': [[276, 335], [394, 335]],
      'Apis>Dtos': [[160, 283], [160, 125], [394, 125]],
      'Services>Repository': [[646, 335], [764, 335]],
      'Services>Entities': [[646, 310], [700, 310], [700, 230], [1320, 230], [1320, 263]],
      'Services>Dtos': [[520, 283], [520, 185]],
      'Repository>Entities': [[1036, 335], [1174, 335]],
      'Dtos>Entities': [[646, 125], [1400, 125], [1400, 263]],
      'Config>Services': [[520, 573], [520, 395]],
      'Config>Repository': [[646, 625], [720, 625], [720, 460], [850, 460], [850, 395]],
      'Config>Jwt': [[646, 650], [764, 650]],
      'Jwt>Repository': [[900, 573], [900, 395]],
      'Jwt>Entities': [[1036, 625], [1390, 625], [1390, 535]],
    },
  },
  frontend: {
    width: 1430, height: 940,
    nodes: {
      App: [600, 70, 250, 90], Assets: [60, 70, 220, 90],
      Features: [60, 310, 520, 540], Shared: [850, 310, 520, 540],
    },
    routes: {
      'App>Features': [[584, 125], [320, 125], [320, 313]],
      'App>Shared': [[866, 125], [1110, 125], [1110, 313]],
      'Features>Shared': [[596, 390], [834, 390]],
      'Shared>Features': [[834, 450], [596, 450]],
    },
  },
};

for (const [parent, children] of [
  ['Features', ['Administration', 'Auth', 'Employee', 'Expert', 'Guest', 'Manager', 'Packages', 'PlatformAdmin', 'Profile', 'Subscription', 'System']],
  ['Shared', ['SharedApi', 'SharedAuth', 'SharedComponents', 'SharedHooks', 'SharedI18n', 'SharedLayouts', 'SharedLib', 'SharedStores', 'SharedStyles']],
]) {
  const [x] = layouts.frontend.nodes[parent];
  children.forEach((id, i) => {
    layouts.frontend.nodes[id] = [x + 28 + (i % 2) * 244, 445 + Math.floor(i / 2) * 62, 220, 52];
  });
}

function arrowhead(points) {
  const end = points[points.length - 1], before = points[points.length - 2];
  const length = Math.hypot(end[0] - before[0], end[1] - before[1]);
  assert(length >= 24, 'Arrow approach must have room for an open head');
  const dx = (end[0] - before[0]) / length, dy = (end[1] - before[1]) / length;
  return [
    [end[0] - dx * 12 - dy * 6, end[1] - dy * 12 + dx * 6],
    end,
    [end[0] - dx * 12 + dy * 6, end[1] - dy * 12 - dx * 6],
  ];
}

function shapeBoxes([x, y, w, h]) {
  return [
    [x, y, Math.min(72, w * 0.4), 20],
    [x, y + 19, w, h - 19],
    [x + 9, y + 28, w, h - 19],
  ];
}

function crossesBox(a, b, box) {
  const [x, y, w, h] = box;
  let low = 0, high = 1;
  for (const [start, delta, min, max] of [
    [a[0], b[0] - a[0], x + 1, x + w - 1],
    [a[1], b[1] - a[1], y + 1, y + h - 1],
  ]) {
    if (delta === 0) {
      if (start <= min || start >= max) return false;
    } else {
      const bounds = [(min - start) / delta, (max - start) / delta].sort((l, r) => l - r);
      low = Math.max(low, bounds[0]);
      high = Math.min(high, bounds[1]);
      if (low >= high) return false;
    }
  }
  return low < high;
}

function render(kind) {
  const id = 'pkg-overview-' + kind;
  const source = fs.readFileSync(path.join(dir, id + '.mmd'), 'utf8');
  const title = source.match(/^title: "(.*)"$/m)[1];
  const nodes = [], stack = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s+(subgraph )?(\w+)\["([^"]+)"\]$/);
    if (match) {
      const [, group, node, label] = match;
      nodes.push({ node, label, parent: stack[stack.length - 1] });
      if (group) stack.push(node);
    } else if (line.trim() === 'end') {
      assert(stack.length > 0, 'Unexpected subgraph end');
      stack.pop();
    }
  }
  assert.equal(stack.length, 0);
  const edges = [...source.matchAll(/^\s+(\w+) -\.-> (\w+)$/gm)].map(([, from, to]) => ({ from, to }));
  const layout = layouts[kind];
  assert.deepEqual(nodes.map(n => n.node).sort(), Object.keys(layout.nodes).sort());
  assert.deepEqual(edges.map(e => e.from + '>' + e.to).sort(), Object.keys(layout.routes).sort());
  for (const { node, label, parent } of nodes) {
    const parentLabel = nodes.find(n => n.node === parent)?.label;
    const directory = kind === 'backend'
      ? path.join(root, 'backend', 'src', 'main', 'java', 'com', 'adaptlearngraph', ...(parentLabel ? [parentLabel] : []), label)
      : path.join(root, 'frontend', 'src', ...(parentLabel ? [parentLabel] : []), label);
    assert(fs.statSync(directory).isDirectory(), 'Package directory missing: ' + directory);
    if (parent) {
      const [x, y, w, h] = layout.nodes[node], [px, py, pw, ph] = layout.nodes[parent];
      assert(x > px && y > py + 60 && x + w + 9 < px + pw && y + h + 9 < py + ph, 'Child outside parent: ' + node);
    }
  }
  const obstacles = nodes.filter(n => !n.parent).flatMap(({ node }) => shapeBoxes(layout.nodes[node]).map(box => ({ node, box })));
  for (const { from, to } of edges) {
    const points = layout.routes[from + '>' + to];
    const head = arrowhead(points);
    for (const point of [...points, ...head]) {
      assert(point[0] >= 20 && point[0] <= layout.width - 20);
      assert(point[1] >= 20 && point[1] <= layout.height - 20);
    }
    for (const segments of [points, head]) {
      for (let i = 1; i < segments.length; i++) {
        for (const { node, box } of obstacles) {
          assert(!crossesBox(segments[i - 1], segments[i], box), `${from}>${to} crosses ${node} or its shadow`);
        }
      }
    }
    for (let i = 1; i < points.length; i++) {
      assert(points[i - 1][0] === points[i][0] || points[i - 1][1] === points[i][1], 'Non-orthogonal route');
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    for (const other of nodes.slice(i + 1)) {
      const node = nodes[i];
      if (node.parent === other.node || other.parent === node.node) continue;
      const [x, y, w, h] = layout.nodes[node.node], [ox, oy, ow, oh] = layout.nodes[other.node];
      assert(x + w + 9 <= ox || ox + ow + 9 <= x || y + h + 9 <= oy || oy + oh + 9 <= y, 'Overlapping packages');
    }
  }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(title)}</title>
<desc id="desc">Top-level UML package folders with one level of actual subpackages. Orthogonal dashed open arrows show selected imports. Arrowheads remain outside folders and shadows.</desc>
<rect width="100%" height="100%" fill="white"/>
<g font-family="Arial, sans-serif"><text x="40" y="32" font-size="18" fill="#333">${escape(title)}</text>`;
  for (const { node, label, parent } of nodes) {
    const [x, y, w, h] = layout.nodes[node];
    const tab = Math.min(72, w * 0.4);
    svg += `<g data-node="${node}">
<path d="M${x + 9} ${y + 28} h${w} v${h - 19} h-${w} Z" fill="#efefef"/>
<rect x="${x}" y="${y}" width="${tab}" height="20" fill="white" stroke="#555" stroke-width="1.8"/>
<rect x="${x}" y="${y + 19}" width="${w}" height="${h - 19}" fill="white" stroke="#555" stroke-width="1.8"/>
<text x="${x + w / 2}" y="${y + (parent ? 39 : 50)}" text-anchor="middle" font-size="${parent ? 15 : 21}" font-weight="${parent ? 600 : 700}" fill="#222">${escape(label)}</text></g>`;
  }
  // Draw explicit heads last, outside all folders and shadows, rather than
  // SVG markers that can be cropped or painted over at package boundaries.
  for (const { from, to } of edges) {
    const points = layout.routes[from + '>' + to];
    const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    const head = arrowhead(points).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    svg += `<path data-edge="${from}&gt;${to}" d="${d}" fill="none" stroke="#555" stroke-width="1.6" stroke-dasharray="6 5"/>
<path data-arrowhead="${from}&gt;${to}" d="${head}" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  svg += `<text x="40" y="${layout.height - 40}" font-size="14" fill="#555">Nested folders: direct subpackages only. Packages with no subpackages remain at their current level.</text>
<text x="40" y="${layout.height - 18}" font-size="14" fill="#555">Dashed arrow: importing package to dependency. Only selected imports are shown.</text></g></svg>\n`;
  return { id, svg, layout, nodes: nodes.length, edges: edges.length };
}

(async () => {
  const diagrams = ['backend', 'frontend'].map(render);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.argv[2] || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  try {
    for (const diagram of diagrams) {
      const { id, svg, layout } = diagram;
      const page = await browser.newPage({ viewport: { width: layout.width, height: layout.height }, deviceScaleFactor: 2 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<!doctype html><style>body{margin:0}svg{display:block}</style>' + svg);
      await page.evaluate(() => document.fonts.ready);
      const validation = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        const parsed = new DOMParser().parseFromString(svg.outerHTML, 'image/svg+xml');
        return {
          validXml: !parsed.querySelector('parsererror'),
          nodes: svg.querySelectorAll('[data-node]').length,
          edges: svg.querySelectorAll('[data-edge]').length,
          arrowheads: svg.querySelectorAll('[data-arrowhead]').length,
          clippedArrowheads: [...svg.querySelectorAll('[data-arrowhead]')].filter(head => {
            const b = head.getBBox(), v = svg.viewBox.baseVal;
            return b.x < 2 || b.y < 2 || b.x + b.width > v.width - 2 || b.y + b.height > v.height - 2;
          }).length,
          clippedLabels: [...svg.querySelectorAll('text')].filter(text => {
            const b = text.getBBox(), v = svg.viewBox.baseVal;
            return b.x < 0 || b.y < 0 || b.x + b.width > v.width || b.y + b.height > v.height;
          }).length,
        };
      });
      assert.deepEqual(errors, []);
      assert.deepEqual(validation, { validXml: true, nodes: diagram.nodes, edges: diagram.edges, arrowheads: diagram.edges, clippedArrowheads: 0, clippedLabels: 0 });
      fs.writeFileSync(path.join(dir, id + '.svg'), svg);
      await page.locator('svg').screenshot({ path: path.join(dir, id + '.png') });
      console.log(JSON.stringify({ id, ...validation, packageOrShadowCrossings: 0, packageOverlaps: 0, pageErrors: errors }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
