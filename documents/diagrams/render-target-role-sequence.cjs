const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(__dirname, '..', '..', 'frontend', 'node_modules', '@playwright', 'test'));

(async () => {
  assert(process.argv[2], 'Provide the local Mermaid bundle path');
  const base = path.join(__dirname, 'mermaid', 'seq-05');
  const source = fs.readFileSync(base + '.mmd', 'utf8');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 2200, height: 1400 }, deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><style>body{margin:0;background:white}svg{display:block;max-width:none!important}</style><div id="diagram"></div>');
    await page.addScriptTag({ path: path.resolve(process.argv[2]) });
    const result = await page.evaluate(async source => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      await mermaid.parse(source);
      const { svg } = await mermaid.render('target_role_sequence', source);
      document.querySelector('#diagram').innerHTML = svg;
      await document.fonts.ready;
      const el = document.querySelector('svg'), view = el.viewBox.baseVal;
      const bottom = view.y + view.height - 20;
      const lines = [...el.querySelectorAll('line.actor-line')];
      lines.forEach(line => line.setAttribute('y2', bottom));
      el.setAttribute('width', Math.ceil(view.width));
      el.setAttribute('height', Math.ceil(view.height));
      const text = new XMLSerializer().serializeToString(el);
      return {
        svg: text,
        lifelines: lines.length,
        complete: lines.every(line => Number(line.getAttribute('y2')) === bottom),
        validXml: !new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror'),
      };
    }, source);
    assert.equal(result.lifelines, 8);
    assert(result.complete && result.validXml);
    fs.writeFileSync(base + '.svg', result.svg + '\n');
    await page.locator('svg').screenshot({ path: base + '.png' });
    console.log('Passed: eight continuous lifelines extend to the final sequence frame; Mermaid parse and SVG XML valid.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
