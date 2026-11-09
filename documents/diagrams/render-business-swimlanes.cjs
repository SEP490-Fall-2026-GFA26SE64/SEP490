// node documents\diagrams\render-business-swimlanes.cjs <mermaid.min.js> [act-01,act-05]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const dir = path.join(__dirname, 'mermaid');
const out = path.join(dir, 'swimlanes');
const report = fs.readFileSync(path.join(root, 'Review 2', 'Report3_Software Requirement Specification.md'), 'utf8');
const scope = [...new Set([...report.matchAll(/\[Mermaid source: ACT-(\d+)\]/g)].map(m => 'act-' + m[1]))];
const ids = process.argv[3] ? process.argv[3].split(',') : scope;
assert(ids.every(id => scope.includes(id)), 'Only Report 3 business flows may be rendered');
const actorOrder = ['Guest', 'System Administrator', 'L&D Manager', 'Expert', 'Responsible Expert', 'Employee', 'Platform Administrator', 'payOS', 'SMTP Service', 'System Handler'];
const workspaceActors = ['Guest', 'System Administrator', 'L&D Manager', 'Expert', 'Employee'];
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"');
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const normalizeActor = actor => {
  const value = decode(actor);
  if (['L and D Manager', 'L&D', 'L&D Manager'].includes(value)) return 'L&D Manager';
  if (value === 'System') return 'System Handler';
  return value;
};
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const edgeKey = e => [e.from, e.to, e.label].join('|');
const plain = s => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function parse(source) {
  const nodes = [], edges = [];
  for (const line of source.split(/\r?\n/)) {
    const m = line.match(/^\s*(\w+)(\[|\{|\(\()"([^"]*)"/);
    if (m) {
      const [, id, shape, label] = m;
      const actor = label.match(/^<b>(.*?)<\/b><br\s*\/?>/);
      nodes.push({ id, original: id, kind: shape === '[' ? 'action' : shape === '{' ? 'decision' : 'terminal', actor: actor ? normalizeActor(actor[1]) : null, label: actor ? label.slice(actor[0].length) : label });
    }
    if (!line.includes('-->') || line.trim().startsWith('%%')) continue;
    const parts = line.trim().split(/\s*-->\s*/);
    let from = parts[0];
    assert(/^\w+$/.test(from), 'Unsupported edge source: ' + line);
    for (const part of parts.slice(1)) {
      const next = part.match(/^(?:\|([^|]*)\|\s*)?(\w+)$/);
      assert(next, 'Unsupported edge: ' + line);
      const label = (next[1] || '').replace(/^"|"$/g, '');
      edges.push({ from, to: next[2], label: decode(label) });
      from = next[2];
    }
  }
  assert(nodes.length && edges.length, 'No business flow found');
  assert.equal(new Set(nodes.map(n => n.id)).size, nodes.length);
  for (const edge of edges) assert(nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to));
  return { nodes, edges };
}

function assignActors(original, id) {
  const variants = new Map();
  for (const node of original.nodes) {
    let actors;
    if (node.actor === 'Guest / Workspace Actor') actors = workspaceActors;
    else if (node.actor === 'Platform / System Administrator') actors = ['Platform Administrator', 'System Administrator'];
    else if (id === 'act-09' && node.id === 'SRS_ACT_09_N1') actors = workspaceActors;
    else if (node.actor) actors = [node.actor];
    else {
      const forward = original.edges.some(e => e.from === node.id);
      const neighbors = original.edges.filter(e => forward ? e.from === node.id : e.to === node.id).map(e => forward ? e.to : e.from);
      actors = [...new Set(neighbors.map(n => original.nodes.find(o => o.id === n)?.actor).filter(Boolean))];
      assert.equal(actors.length, 1, 'Ambiguous terminal ownership: ' + node.id);
    }
    variants.set(node.id, actors.map(actor => {
      assert(actorOrder.includes(actor), 'Unknown actor: ' + actor);
      return { ...node, actor, id: actors.length === 1 ? node.id : node.id + '_' + actor.replace(/[^A-Za-z0-9]/g, '') };
    }));
  }
  const nodes = [...variants.values()].flat(), edges = [];
  for (const originalEdge of original.edges) {
    const froms = variants.get(originalEdge.from), tos = variants.get(originalEdge.to);
    for (const from of froms) for (const to of tos) {
      if (froms.length > 1 && tos.length > 1 && from.actor !== to.actor) continue;
      edges.push({ ...originalEdge, from: from.id, to: to.id, original: originalEdge });
    }
  }
  assert.deepEqual([...new Set(nodes.map(n => n.original))].sort(), original.nodes.map(n => n.id).sort());
  assert.deepEqual([...new Set(edges.map(e => edgeKey(e.original)))].sort(), [...new Set(original.edges.map(edgeKey))].sort());
  for (const node of nodes) assert.equal(plain(node.label), plain(original.nodes.find(n => n.id === node.original).label));
  return { id, nodes, edges, actors: actorOrder.filter(actor => nodes.some(n => n.actor === actor)) };
}

function wrap(label, max = 32) {
  return label.split(/<br\s*\/?>/i).flatMap(part => {
    const lines = [], words = plain(part).split(/\s+/);
    let line = '';
    for (const word of words) {
      if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    return lines;
  });
}

function crossesBox(a, b, n, pad = 3) {
  const box = [n.x - n.w / 2 - pad, n.y - n.h / 2 - pad, n.w + pad * 2, n.h + pad * 2];
  let low = 0, high = 1;
  for (const [start, delta, min, max] of [[a[0], b[0] - a[0], box[0], box[0] + box[2]], [a[1], b[1] - a[1], box[1], box[1] + box[3]]]) {
    if (!delta) { if (start <= min || start >= max) return false; }
    else {
      const bounds = [(min - start) / delta, (max - start) / delta].sort((l, r) => l - r);
      low = Math.max(low, bounds[0]); high = Math.min(high, bounds[1]);
      if (low >= high) return false;
    }
  }
  return low < high;
}

function simplify(points) {
  const result = [];
  for (const point of points) {
    if (result.length && result[result.length - 1].every((v, i) => v === point[i])) continue;
    result.push(point);
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3);
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) result.splice(result.length - 2, 1);
      else break;
    }
  }
  return result;
}

function routePair(a, b) {
  let overlapPixels = 0;
  const crossings = new Set();
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    const [p, q, r, s] = [a[i - 1], a[i], b[j - 1], b[j]];
    const av = p[0] === q[0], bv = r[0] === s[0];
    if (av === bv) {
      const axis = av ? 1 : 0, fixed = av ? 0 : 1;
      if (p[fixed] !== r[fixed]) continue;
      const length = Math.min(Math.max(p[axis], q[axis]), Math.max(r[axis], s[axis])) - Math.max(Math.min(p[axis], q[axis]), Math.min(r[axis], s[axis]));
      if (length > 1) overlapPixels += length;
    } else {
      const [v1, v2, h1, h2] = av ? [p, q, r, s] : [r, s, p, q];
      const x = v1[0], y = h1[1];
      if (x > Math.min(h1[0], h2[0]) + 1 && x < Math.max(h1[0], h2[0]) - 1 && y > Math.min(v1[1], v2[1]) + 1 && y < Math.max(v1[1], v2[1]) - 1) crossings.add(x + ',' + y);
    }
  }
  return { overlapPixels, crossings: crossings.size };
}

function routingMetrics(routes) {
  let overlapPixels = 0, overlappingPairs = 0, crossings = 0;
  for (let i = 0; i < routes.length; i++) for (const other of routes.slice(i + 1)) {
    const pair = routePair(routes[i], other);
    overlapPixels += pair.overlapPixels; crossings += pair.crossings;
    if (pair.overlapPixels > 0) overlappingPairs++;
  }
  return { overlapPixels, overlappingPairs, crossings };
}

function parallelCrowding(a, b, minimum = 24) {
  let crowdedSegments = 0, penalty = 0, minimumGap = Infinity;
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    const [p, q, r, s] = [a[i - 1], a[i], b[j - 1], b[j]];
    const vertical = p[0] === q[0];
    if (vertical !== (r[0] === s[0])) continue;
    const axis = vertical ? 1 : 0, fixed = 1 - axis;
    const length = Math.min(Math.max(p[axis], q[axis]), Math.max(r[axis], s[axis])) - Math.max(Math.min(p[axis], q[axis]), Math.min(r[axis], s[axis]));
    if (length < 48) continue;
    const gap = Math.abs(p[fixed] - r[fixed]);
    minimumGap = Math.min(minimumGap, gap);
    if (gap < minimum) { crowdedSegments++; penalty += length * (minimum - gap); }
  }
  return { crowdedSegments, penalty, minimumGap };
}

function spacingMetrics(routes) {
  let crowdedSegments = 0, minimumGap = Infinity;
  for (let i = 0; i < routes.length; i++) for (const other of routes.slice(i + 1)) {
    const pair = parallelCrowding(routes[i], other);
    crowdedSegments += pair.crowdedSegments;
    minimumGap = Math.min(minimumGap, pair.minimumGap);
  }
  return { requiredGap: 24, minimumParallelRun: 48, crowdedSegments, minimumGap: Number.isFinite(minimumGap) ? minimumGap : null };
}

function orderActors(flow) {
  const first = flow.nodes.find(n => n.kind === 'terminal' && outgoingCount(n.id))?.actor || flow.actors[0];
  function outgoingCount(id) { return flow.edges.some(e => e.from === id); }
  const byId = new Map(flow.nodes.map(n => [n.id, n]));
  const cost = order => flow.edges.reduce((sum, edge) => sum + Math.abs(order.indexOf(byId.get(edge.from).actor) - order.indexOf(byId.get(edge.to).actor)), 0);
  let best = [first, ...flow.actors.filter(a => a !== first)], bestCost = cost(best);
  function search(prefix, rest) {
    if (!rest.length) {
      const value = cost(prefix);
      if (value < bestCost) { best = prefix; bestCost = value; }
      return;
    }
    rest.forEach((actor, i) => search([...prefix, actor], rest.filter((_, j) => i !== j)));
  }
  search([first], flow.actors.filter(a => a !== first));
  flow.actors = best;
}

function arrowHead(points) {
  const last = points[points.length - 1], before = points[points.length - 2];
  const length = Math.hypot(last[0] - before[0], last[1] - before[1]);
  assert(length >= 10, 'Arrow approach too short');
  const dx = (last[0] - before[0]) / length, dy = (last[1] - before[1]) / length;
  return [[last[0] - dx * 9 - dy * 4, last[1] - dy * 9 + dx * 4], last, [last[0] - dx * 9 + dy * 4, last[1] - dy * 9 - dx * 4]];
}

function optimizeRoutes(flow, geometry) {
  const { nodes, edges } = flow, { rows, width, height } = geometry;
  const spaced = flow.id === 'act-05';
  const byId = new Map(nodes.map(n => [n.id, n]));
  const candidates = new Map();
  const port = (node, side, edge, source) => {
    const related = edges.filter(e => source ? e.from === node.id : e.to === node.id);
    const offset = node.kind === 'action' ? (related.indexOf(edge) - (related.length - 1) / 2) * Math.min(24, 100 / Math.max(1, related.length - 1)) : 0;
    const pad = source ? 7 : 9;
    if (side === 'B') return [node.x + offset, node.y + node.h / 2 + pad];
    if (side === 'T') return [node.x + offset, node.y - node.h / 2 - pad];
    return [node.x + (side === 'L' ? -1 : 1) * (node.w / 2 + pad), node.y + Math.max(-12, Math.min(12, offset))];
  };
  const facing = (side, a, b) => side === 'B' ? b[0] === a[0] && b[1] > a[1] : side === 'T' ? b[0] === a[0] && b[1] < a[1] : side === 'L' ? b[1] === a[1] && b[0] < a[0] : b[1] === a[1] && b[0] > a[0];
  const clear = points => points.every(p => p[0] > 3 && p[0] < width - 3 && p[1] > 115 && p[1] < height - 57) && points.slice(1).every((p, i) => (p[0] === points[i][0] || p[1] === points[i][1]) && !nodes.some(n => crossesBox(points[i], p, n)));
  for (const edge of edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to), options = new Map();
    if (spaced && from.kind === 'terminal' && plain(from.label) === 'Start' && from.actor === to.actor) {
      assert.equal(from.x, to.x, 'Start and its first action must share a vertical centerline');
      const points = [[from.x, from.y + from.h / 2 + 7], [to.x, to.y - to.h / 2 - 9]];
      assert(clear(points), 'The straight start connector must clear all nodes');
      edge.points = points;
      candidates.set(edge, [points]);
      continue;
    }
    const add = (points, sourceSide, targetSide) => {
      points = simplify(points);
      if (points.length < 2 || !facing(sourceSide, points[0], points[1]) || !facing(targetSide, points[points.length - 1], points[points.length - 2]) || !clear(points)) return;
      const last = points[points.length - 1], before = points[points.length - 2];
      if (Math.hypot(last[0] - before[0], last[1] - before[1]) < 10) return;
      options.set(JSON.stringify(points), points);
    };
    options.set(JSON.stringify(edge.points), edge.points);
    for (const sourceSide of ['B', 'L', 'R']) for (const targetSide of ['T', 'L', 'R', 'B']) {
      const start = port(from, sourceSide, edge, true), end = port(to, targetSide, edge, false);
      add([start, end], sourceSide, targetSide);
      add([start, [start[0], end[1]], end], sourceSide, targetSide);
      add([start, [end[0], start[1]], end], sourceSide, targetSide);
      for (let i = 0; i < (spaced ? 8 : 6); i++) {
        for (const y of [rows[from.level].bottom + 20 + i * (spaced ? 32 : 18), rows[to.level].top - 20 - i * (spaced ? 32 : 18)]) add([start, [start[0], y], [end[0], y], end], sourceSide, targetSide);
      }
      for (let i = 0; i < (spaced ? 8 : 4); i++) {
        for (const x of [from.x - from.w / 2 - 18 - i * (spaced ? 28 : 10), from.x + from.w / 2 + 18 + i * (spaced ? 28 : 10), to.x - to.w / 2 - 18 - i * (spaced ? 28 : 10), to.x + to.w / 2 + 18 + i * (spaced ? 28 : 10)]) add([start, [x, start[1]], [x, end[1]], end], sourceSide, targetSide);
      }
    }
    candidates.set(edge, [...options.values()]);
  }
  const score = (route, otherEdges) => {
    let value = (route.length - 2) * 10;
    for (let i = 1; i < route.length; i++) value += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]) * 0.01;
    for (const other of otherEdges) {
      const pair = routePair(route, other.points);
      value += pair.overlapPixels * 1000 + pair.crossings * 1000;
      if (spaced) value += parallelCrowding(route, other.points).penalty * 100;
    }
    return value;
  };
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const edge of pass % 2 ? [...edges].reverse() : edges) {
      const others = edges.filter(e => e !== edge);
      let best = edge.points, bestScore = score(best, others);
      for (const option of candidates.get(edge)) {
        const value = score(option, others);
        if (value < bestScore - 0.001) { best = option; bestScore = value; }
      }
      if (best !== edge.points) { edge.points = best; changed = true; }
    }
    if (!changed) break;
  }
  // Resolve shared-port local minima by considering both affected routes together.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false;
    for (let i = 0; i < edges.length; i++) for (const b of edges.slice(i + 1)) {
      const a = edges[i];
      if (!routePair(a.points, b.points).overlapPixels && (!spaced || !parallelCrowding(a.points, b.points).crowdedSegments)) continue;
      const others = edges.filter(e => e !== a && e !== b);
      const ranked = edge => candidates.get(edge).map(points => ({ points, cost: score(points, others) })).sort((x, y) => x.cost - y.cost).slice(0, 16);
      const interaction = (x, y) => { const pair = routePair(x, y); return pair.overlapPixels * 1000 + pair.crossings * 1000 + (spaced ? parallelCrowding(x, y).penalty * 100 : 0); };
      let bestA = a.points, bestB = b.points, bestCost = score(bestA, others) + score(bestB, others) + interaction(bestA, bestB);
      for (const x of ranked(a)) for (const y of ranked(b)) {
        const cost = x.cost + y.cost + interaction(x.points, y.points);
        if (cost < bestCost - 0.001) { bestA = x.points; bestB = y.points; bestCost = cost; }
      }
      if (bestA !== a.points || bestB !== b.points) { a.points = bestA; b.points = bestB; changed = true; }
    }
    if (!changed) break;
  }
  edges.forEach(edge => { edge.head = arrowHead(edge.points); });
  const placedLabels = [], overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
  for (const edge of edges.filter(e => e.label)) {
    const labelWidth = edge.label.length * 7.2 + 8;
    const options = [];
    for (let i = 1; i < edge.points.length; i++) {
      const [a, b] = [edge.points[i - 1], edge.points[i]];
      if (a[1] === b[1]) {
        if (Math.abs(a[0] - b[0]) < labelWidth + 10) continue;
        for (const fraction of [0.25, 0.5, 0.75]) for (const dy of [-9, 21]) options.push([a[0] + (b[0] - a[0]) * fraction, a[1] + dy]);
      } else if (Math.abs(a[1] - b[1]) > 34) {
        for (const fraction of [0.15, 0.3, 0.5, 0.7, 0.85]) for (const dx of [-labelWidth / 2 - 10, labelWidth / 2 + 10]) options.push([a[0] + dx, a[1] + (b[1] - a[1]) * fraction + 4]);
      }
    }
    const valid = options.filter(([x, y]) => {
      const rect = { x: x - labelWidth / 2, y: y - 14, w: labelWidth, h: 18 };
      return rect.x > 4 && rect.x + rect.w < width - 4 && rect.y > 115 && rect.y + rect.h < height - 57 &&
        !nodes.some(n => overlaps(rect, { x: n.x - n.w / 2 - 4, y: n.y - n.h / 2 - 4, w: n.w + 8, h: n.h + 8 })) &&
        !placedLabels.some(other => overlaps(rect, other)) &&
        !edges.some(e => overlaps(rect, { x: Math.min(...e.head.map(p => p[0])) - 3, y: Math.min(...e.head.map(p => p[1])) - 3, w: 16, h: 16 }));
    });
    assert(valid.length, 'No clear label position for ' + edgeKey(edge) + ': ' + JSON.stringify({ points: edge.points, options }));
    const from = byId.get(edge.from);
    valid.sort((a, b) => Math.hypot(a[0] - from.x, a[1] - from.y) - Math.hypot(b[0] - from.x, b[1] - from.y));
    edge.labelAt = valid[0];
    placedLabels.push({ x: valid[0][0] - labelWidth / 2, y: valid[0][1] - 14, w: labelWidth, h: 18 });
  }
}

function layout(flow) {
  orderActors(flow);
  const spaced = flow.id === 'act-05';
  const { nodes, edges, actors } = flow, byId = new Map(nodes.map(n => [n.id, n]));
  const outgoing = id => edges.filter(e => e.from === id);
  const incoming = id => edges.filter(e => e.to === id);
  const color = new Map(), back = new Set();
  function visit(id) {
    color.set(id, 'gray');
    for (const edge of outgoing(id)) {
      if (color.get(edge.to) === 'gray') back.add(edge);
      else if (!color.has(edge.to)) visit(edge.to);
    }
    color.set(id, 'black');
  }
  nodes.forEach(n => { if (!color.has(n.id)) visit(n.id); });
  const forward = edges.filter(e => !back.has(e)), occupied = new Set();
  const pending = new Map(nodes.map(n => [n.id, forward.filter(e => e.to === n.id).length]));
  const ready = nodes.filter(n => pending.get(n.id) === 0);
  nodes.forEach(n => {
    n.lines = wrap(n.label);
    n.w = n.kind === 'terminal' ? 64 : n.kind === 'decision' ? 310 : 300;
    n.h = n.kind === 'terminal' ? 64 : n.kind === 'decision' ? Math.max(150, n.lines.length * 44 + 70) : n.lines.length * 20 + 32;
    n.level = 0;
  });
  let visited = 0;
  while (ready.length) {
    const n = ready.shift();
    while (occupied.has(n.actor + ':' + n.level)) n.level++;
    occupied.add(n.actor + ':' + n.level); visited++;
    for (const e of forward.filter(e => e.from === n.id)) {
      const to = byId.get(e.to); to.level = Math.max(to.level, n.level + 1);
      pending.set(to.id, pending.get(to.id) - 1);
      if (pending.get(to.id) === 0) ready.push(to);
    }
  }
  assert.equal(visited, nodes.length, 'Unresolved cycle after back-edge routing');
  const rows = [];
  let y = 145;
  for (let i = 0; i <= Math.max(...nodes.map(n => n.level)); i++) {
    const members = nodes.filter(n => n.level === i);
    const h = Math.max(64, ...members.map(n => n.h));
    rows.push({ top: y, bottom: y + h });
    members.forEach(n => { n.y = y + h / 2; });
    const outCount = edges.filter(e => byId.get(e.from).level === i).length;
    const inCount = edges.filter(e => byId.get(e.to).level === i + 1).length;
    y += h + (spaced ? 80 + 32 * (outCount + inCount) : 48 + 22 * (outCount + inCount));
  }
  const laneWidth = spaced ? 620 : 460, margin = 35, width = margin * 2 + actors.length * laneWidth, height = y + 58;
  nodes.forEach(n => { n.lane = actors.indexOf(n.actor); n.x = margin + laneWidth * (n.lane + 0.5); });
  const channels = new Map(), rowOut = new Map(), rowIn = new Map();
  for (const edge of edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    const direct = !back.has(edge) && from.actor === to.actor && to.level === from.level + 1 && outgoing(from.id).length === 1 && incoming(to.id).length === 1;
    const start = [from.x, from.y + from.h / 2 + 7], end = [to.x, to.y - to.h / 2 - 9];
    if (direct) {
      edge.points = [start, end];
      edge.labelAt = [from.x + 30 + edge.label.length * 3.5, (start[1] + end[1]) / 2];
    } else {
      const oi = rowOut.get(from.level) || 0, ii = rowIn.get(to.level) || 0;
      rowOut.set(from.level, oi + 1); rowIn.set(to.level, ii + 1);
      const exitY = rows[from.level].bottom + 20 + oi * (spaced ? 32 : 22);
      const enterY = rows[to.level].top - 20 - ii * (spaced ? 32 : 22);
      const low = Math.min(exitY, enterY), high = Math.max(exitY, enterY);
      const laneChannels = channels.get(to.lane) || [];
      let slot = 0;
      while (laneChannels[slot]?.some(([a, b]) => low <= b + 14 && high >= a - 14)) slot++;
      if (!laneChannels[slot]) laneChannels[slot] = [];
      laneChannels[slot].push([low, high]); channels.set(to.lane, laneChannels);
      assert(slot < 10, 'Too many overlapping route channels');
      const channelX = spaced ? to.x - Math.max(...nodes.filter(n => n.actor === to.actor).map(n => n.w / 2)) - 28 - slot * 28 : margin + to.lane * laneWidth + 12 + slot * 6;
      edge.points = [start, [from.x, exitY], [channelX, exitY], [channelX, enterY], [to.x, enterY], end];
      edge.labelAt = [(from.x + channelX) / 2, exitY - 7];
    }
    const points = edge.points;
    const last = points[points.length - 1], before = points[points.length - 2];
    const length = Math.hypot(last[0] - before[0], last[1] - before[1]);
    assert(length >= 10, 'Arrow approach too short');
    const dx = (last[0] - before[0]) / length, dy = (last[1] - before[1]) / length;
    edge.head = [[last[0] - dx * 9 - dy * 4, last[1] - dy * 9 + dx * 4], last, [last[0] - dx * 9 + dy * 4, last[1] - dy * 9 - dx * 4]];
    for (const segments of [edge.points, edge.head]) {
      for (let i = 1; i < segments.length; i++) {
        for (const n of nodes) assert(!crossesBox(segments[i - 1], segments[i], n), `${edge.from}>${edge.to} crosses ${n.id}`);
      }
      for (const p of segments) assert(p[0] > 3 && p[0] < width - 3 && p[1] > 3 && p[1] < height - 3, 'Clipped route/head');
    }
  }
  const geometry = { width, height, laneWidth, margin, rows, backEdges: back.size };
  geometry.initialRouting = routingMetrics(edges.map(e => e.points));
  optimizeRoutes(flow, geometry);
  geometry.optimizedRouting = routingMetrics(edges.map(e => e.points));
  if (spaced) {
    geometry.parallelSpacing = spacingMetrics(edges.map(e => e.points));
    assert.equal(geometry.parallelSpacing.crowdedSegments, 0, 'ACT-05 has parallel arrow runs less than 24px apart');
  }
  assert(geometry.optimizedRouting.overlapPixels <= geometry.initialRouting.overlapPixels, 'Arrow overlap increased');
  assert(geometry.optimizedRouting.crossings <= geometry.initialRouting.crossings, 'Arrow crossings increased');
  for (const edge of edges) for (const segments of [edge.points, edge.head]) for (let i = 1; i < segments.length; i++) {
    for (const node of nodes) assert(!crossesBox(segments[i - 1], segments[i], node), 'Optimized route/head crosses a node');
  }
  return geometry;
}

function mermaidSource(title, flow) {
  let text = `---\ntitle: "${title.replaceAll('"', "'")}"\nconfig: {theme: base, look: classic, flowchart: {htmlLabels: true}}\n---\nflowchart TD\n`;
  flow.actors.forEach((actor, i) => {
    text += `  subgraph Actor${i}["${escape(actor)}"]\n    direction TB\n`;
    for (const node of flow.nodes.filter(n => n.actor === actor)) {
      const label = node.label.replaceAll('"', '&quot;');
      const shape = node.kind === 'terminal' ? `(("${label}"))` : node.kind === 'decision' ? `{"${label}"}` : `["${label}"]`;
      text += `    ${node.id}${shape}\n`;
    }
    text += '  end\n';
  });
  for (const edge of flow.edges) text += `  ${edge.from} -->${edge.label ? '|"' + escape(edge.label) + '"|' : ''} ${edge.to}\n`;
  text += '\n  %% Fixed actor-column layout is exported by render-business-swimlanes.cjs.\n';
  if (flow.nodes.some(n => n.id !== n.original)) text += '  %% Repeated actor-specific copies are alternatives of the same original step.\n';
  return text;
}

function svgSource(title, flow, geometry) {
  const { width, height, margin, laneWidth } = geometry;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">Actor-column swimlane activity diagram. All original steps, branches and return edges are retained. Line crossings do not indicate junctions.</desc><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif"><text x="${width / 2}" y="30" text-anchor="middle" font-size="20" fill="#0f1729">${escape(title)}</text>`;
  for (let i = 0; i < flow.actors.length; i++) {
    const x = margin + i * laneWidth;
    svg += `<g data-lane="${escape(flow.actors[i])}"><rect x="${x}" y="58" width="${laneWidth}" height="${height - 115}" fill="white" stroke="#cbd5e1" stroke-width="1"/><rect x="${x}" y="58" width="${laneWidth}" height="52" fill="#fef3eb" stroke="#cbd5e1" stroke-width="1"/><text class="lane-header" x="${x + laneWidth / 2}" y="91" text-anchor="middle" font-size="19" font-weight="700" fill="#0f1729">${escape(flow.actors[i])}</text></g>`;
  }
  for (const node of flow.nodes) {
    const x = node.x - node.w / 2, y = node.y - node.h / 2;
    const fill = node.kind === 'terminal' ? '#c24a0a' : node.kind === 'decision' ? '#fef3eb' : node.original === 'PUBLISHED' ? '#f0fdf4' : '#ffffff';
    const stroke = node.kind === 'terminal' ? '#c24a0a' : node.kind === 'decision' ? '#e6650f' : node.original === 'PUBLISHED' ? '#16a34a' : '#64748b';
    svg += `<g class="node" data-node="${node.id}" data-original="${node.original}" data-actor="${escape(node.actor)}" data-kind="${node.kind}">`;
    if (node.kind === 'terminal') svg += `<circle cx="${node.x}" cy="${node.y}" r="${node.w / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    else if (node.kind === 'decision') svg += `<polygon points="${node.x},${y} ${x + node.w},${node.y} ${node.x},${y + node.h} ${x},${node.y}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    else svg += `<rect x="${x}" y="${y}" width="${node.w}" height="${node.h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
    const first = node.y - (node.lines.length - 1) * 10 + 5;
    node.lines.forEach((line, i) => { svg += `<text x="${node.x}" y="${first + i * 20}" text-anchor="middle" font-size="15.5" fill="${node.kind === 'terminal' ? '#ffffff' : '#0f1729'}">${escape(line)}</text>`; });
    svg += '</g>';
  }
  for (const edge of flow.edges) {
    const d = edge.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    svg += `<path d="${d}" fill="none" stroke="white" stroke-width="4"/><path data-edge="${escape(edgeKey(edge))}" d="${d}" fill="none" stroke="#64748b" stroke-width="1.3"/><polygon data-arrowhead="${escape(edgeKey(edge))}" points="${edge.head.map(p => p.join(',')).join(' ')}" fill="#64748b"/>`;
  }
  for (const edge of flow.edges.filter(e => e.label)) {
    const [x, y] = edge.labelAt;
    svg += `<text class="edge-label" x="${x}" y="${y}" text-anchor="middle" font-size="13" fill="#334155" style="paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round">${escape(edge.label)}</text>`;
  }
  svg += `<text x="${margin}" y="${height - 27}" font-size="13" fill="#64748b">Each column is one actor. Crossings are not junctions; return arrows retain the original flow.</text>`;
  if (flow.nodes.some(n => n.id !== n.original)) svg += `<text x="${margin}" y="${height - 8}" font-size="13" fill="#64748b">Repeated steps in different actor columns are alternatives, not additional required actions.</text>`;
  return svg + '</g></svg>\n';
}

const { chromium } = require(path.join(root, 'frontend', 'node_modules', '@playwright', 'test'));
(async () => {
  assert(process.argv[2], 'Provide a local Mermaid bundle');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const results = [];
  try {
    for (const id of ids) {
      const file = path.join(dir, id + '.mmd'), originalSource = fs.readFileSync(file, 'utf8');
      const previousFile = path.join(out, id + '.svg');
      const previousRoutes = fs.existsSync(previousFile) ? [...fs.readFileSync(previousFile, 'utf8').matchAll(/<path data-edge="[^"]*" d="([^"]+)"/g)].map(m => [...m[1].matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(p => [+p[1], +p[2]])) : [];
      const previousRouting = previousRoutes.length ? routingMetrics(previousRoutes) : null;
      const title = originalSource.match(/^title: "(.*)"$/m)[1] + ' - Swimlane';
      const original = parse(originalSource), flow = assignActors(original, id), geometry = layout(flow);
      const source = mermaidSource(title, flow), svg = svgSource(title, flow, geometry);
      const page = await browser.newPage({ viewport: { width: geometry.width, height: Math.min(1200, geometry.height) }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setContent('<!doctype html><style>body{margin:0;background:white}svg{display:block}</style>' + svg);
      await page.addScriptTag({ path: path.resolve(process.argv[2]) });
      await page.evaluate(async source => { mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', maxTextSize: 150000 }); await mermaid.parse(source); await document.fonts.ready; }, source);
      const checks = await page.evaluate(() => {
        const svg = document.querySelector('svg'), frame = svg.viewBox.baseVal;
        const nodes = [...svg.querySelectorAll('g.node')], labels = [...svg.querySelectorAll('.edge-label')];
        const box = e => e.getBBox();
        const overlap = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
        const lanes = new Map([...svg.querySelectorAll('[data-lane]')].map(lane => [lane.dataset.lane, box(lane.querySelector('rect'))]));
        const outsideLanes = nodes.filter(node => {
          const n = box(node), lane = lanes.get(node.dataset.actor);
          return !lane || n.x < lane.x + 4 || n.x + n.width > lane.x + lane.width - 4 || n.y < lane.y + 52 || n.y + n.height > lane.y + lane.height - 4;
        }).map(node => node.dataset.node);
        const nodeNodeCollisions = nodes.flatMap((node, i) => nodes.slice(i + 1).filter(other => overlap(box(node), box(other))).map(other => [node.dataset.node, other.dataset.node]));
        const labelArrowheadCollisions = labels.flatMap(label => [...svg.querySelectorAll('[data-arrowhead]')].filter(head => overlap(box(label), box(head))).map(head => [label.textContent, head.dataset.arrowhead]));
        const clippedText = [...svg.querySelectorAll('text')].filter(e => { const b = box(e); return b.x < 0 || b.y < 0 || b.x + b.width > frame.width || b.y + b.height > frame.height; }).map(e => e.textContent);
        const outsideShapes = nodes.flatMap(node => {
          const shape = node.querySelector('rect,polygon,circle'), b = box(shape);
          return [...node.querySelectorAll('text')].filter(text => {
            const t = box(text);
            if (node.dataset.kind === 'decision') return [[t.x, t.y], [t.x + t.width, t.y], [t.x, t.y + t.height], [t.x + t.width, t.y + t.height]].some(([x, y]) => Math.abs(x - b.x - b.width / 2) / (b.width / 2) + Math.abs(y - b.y - b.height / 2) / (b.height / 2) > 1);
            return t.x < b.x + 2 || t.y < b.y + 2 || t.x + t.width > b.x + b.width - 2 || t.y + t.height > b.y + b.height - 2;
          }).map(text => [node.dataset.node, text.textContent]);
        });
        const labelNodeCollisions = labels.flatMap(label => nodes.filter(node => overlap(box(label), box(node))).map(node => [label.textContent, node.dataset.node]));
        const labelLabelCollisions = labels.flatMap((label, i) => labels.slice(i + 1).filter(other => overlap(box(label), box(other))).map(other => [label.textContent, other.textContent]));
        const xml = new DOMParser().parseFromString(svg.outerHTML, 'image/svg+xml');
        return { nodes: nodes.length, edges: svg.querySelectorAll('[data-edge]').length, arrowheads: svg.querySelectorAll('[data-arrowhead]').length, actors: [...svg.querySelectorAll('.lane-header')].map(e => e.textContent), clippedText, outsideShapes, outsideLanes, nodeNodeCollisions, labelNodeCollisions, labelLabelCollisions, labelArrowheadCollisions, validXml: !xml.querySelector('parsererror') };
      });
      assert.deepEqual(errors, []);
      assert.equal(checks.nodes, flow.nodes.length); assert.equal(checks.edges, flow.edges.length); assert.equal(checks.arrowheads, flow.edges.length);
      assert.deepEqual(checks.actors, flow.actors); assert.equal(checks.validXml, true);
      for (const name of ['clippedText', 'outsideShapes', 'outsideLanes', 'nodeNodeCollisions', 'labelNodeCollisions', 'labelLabelCollisions', 'labelArrowheadCollisions']) assert.deepEqual(checks[name], [], id + ' ' + name);
      assert.equal(hash(fs.readFileSync(file)), hash(originalSource), 'Original source changed during rendering');
      fs.writeFileSync(path.join(out, id + '.mmd'), source);
      fs.writeFileSync(path.join(out, id + '.svg'), svg);
      await page.locator('svg').screenshot({ path: path.join(out, id + '.png') });
      const result = { id, originalHash: hash(originalSource), originalNodes: original.nodes.length, originalEdges: original.edges.length, width: geometry.width, height: geometry.height, ...checks, previousRouting, initialRouting: geometry.initialRouting, optimizedRouting: geometry.optimizedRouting, previousParallelSpacing: id === 'act-05' && previousRoutes.length ? spacingMetrics(previousRoutes) : undefined, parallelSpacing: geometry.parallelSpacing, graphParity: 'Passed', actorOwnership: 'Passed', routeNodeCrossings: 0, clippedArrowheads: 0, pageErrors: errors };
      results.push(result); console.log(JSON.stringify(result));
      await page.close();
    }
    const checksFile = path.join(out, 'checks.json');
    const prior = fs.existsSync(checksFile) ? JSON.parse(fs.readFileSync(checksFile, 'utf8')).filter(r => !ids.includes(r.id)) : [];
    fs.writeFileSync(checksFile, JSON.stringify([...prior, ...results].sort((a, b) => a.id.localeCompare(b.id)), null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
