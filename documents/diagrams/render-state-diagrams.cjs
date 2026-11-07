// node documents/diagrams/render-state-diagrams.cjs <mermaid12.min.js> [st-13,st-19]
// Scope: ST-13/14/16/17/18/19 only. ST-01 is the unchanged visual reference.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(__dirname,'mermaid'),out=path.join(dir,'st01-standard-20261106');
const{chromium}=require(path.join(root,'frontend/node_modules/@playwright/test'));
const scope=['st-13','st-14','st-16','st-17','st-18','st-19'];
const ids=process.argv[3]?process.argv[3].split(','):scope;
assert(ids.every(id=>scope.includes(id)),'Only ST-13/14/16/17/18/19 may be rendered by this task.');
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const results=[];try{
 for(const id of ids){const page=await browser.newPage({viewport:{width:1800,height:1200},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><meta charset="UTF-8"><style>body{margin:0;background:white}#diagram{display:inline-block}svg{display:block;max-width:none!important}</style><div id="diagram"></div>');
  await page.addScriptTag({path:path.resolve(process.argv[2])});const source=fs.readFileSync(path.join(dir,id+'.mmd'),'utf8');
  const groups=[],stack=[];let edgeIndex=0;
  for(const line of source.split('\n')){const m=line.match(/^\s*state\s+".*?"\s+as\s+(\w+)\s*\{/);if(m){const group={id:m[1],edges:[]};groups.push(group);stack.push(group);}else if(/^\s*}\s*$/.test(line))stack.pop();else if(line.includes('-->')){for(const group of stack)group.edges.push(edgeIndex);edgeIndex++;}}
  const result=await page.evaluate(async({source,id,groups})=>{
   mermaid.initialize({startOnLoad:false,securityLevel:'loose',maxTextSize:150000});await mermaid.parse(source);
   const{svg}=await mermaid.render('standard_'+id.replaceAll('-','_'),source);document.querySelector('#diagram').innerHTML=svg;await document.fonts.ready;
   const el=document.querySelector('#diagram svg');let frameExpansions=0;
   // Mermaid omits self-loop labels from some composite frame bounds. Keep each
   // existing frame around its own labels without moving any state or transition.
   for(const group of groups){const frame=[...el.querySelectorAll('g.statediagram-cluster')].find(g=>g.id.includes('-state-'+group.id+'-'));if(!frame)continue;
    const outer=frame.querySelector('rect.outer');if(!outer)continue;const inverse=frame.getScreenCTM().inverse();let x=+outer.getAttribute('x'),right=x+(+outer.getAttribute('width'));
    for(const i of group.edges){const label=el.querySelector('g.edgeLabel [data-id="edge'+i+'"]');if(!label||!label.textContent.trim())continue;const b=label.getBoundingClientRect(),l=new DOMPoint(b.left,b.top).matrixTransform(inverse),r=new DOMPoint(b.right,b.bottom).matrixTransform(inverse);x=Math.min(x,l.x-16);right=Math.max(right,r.x+16);}
    if(x!==+outer.getAttribute('x')||right-x!==+outer.getAttribute('width')){for(const rect of frame.querySelectorAll('rect.outer,rect.inner')){rect.setAttribute('x',x);rect.setAttribute('width',right-x);}const label=frame.querySelector('.cluster-label'),t=label.transform.baseVal.consolidate().matrix;label.setAttribute('transform','translate('+(x+(right-x-label.getBBox().width)/2)+','+t.f+')');frameExpansions++;}
   }
   if(frameExpansions){const b=el.getBBox();el.setAttribute('viewBox',[b.x-16,b.y-16,b.width+32,b.height+32].join(' '));el.querySelector('.statediagramTitleText')?.setAttribute('x',b.x+b.width/2);}
   const v=el.viewBox.baseVal;el.setAttribute('width',Math.ceil(v.width));el.setAttribute('height',Math.ceil(v.height));el.style.maxWidth='none';
   const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};},overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2;
   const nodes=[...el.querySelectorAll('g.node')].filter(e=>!e.querySelector('g.node')).map(e=>({id:e.id,box:rect(e)}));
   const labels=[...el.querySelectorAll('g.edgeLabel')].filter(e=>e.textContent.trim()).map(e=>({text:e.textContent.trim(),box:rect(e)}));
   const labelNodeCollisions=labels.flatMap(l=>nodes.filter(n=>overlap(l.box,n.box)).map(n=>({label:l.text,node:n.id})));
   const labelLabelCollisions=labels.flatMap((l,i)=>labels.slice(i+1).filter(o=>overlap(l.box,o.box)).map(o=>[l.text,o.text]));
   const frames=[...el.querySelectorAll('g.statediagram-cluster rect.outer')].map(e=>({id:e.closest('g.statediagram-cluster').id,box:rect(e)}));const frameCollisions=frames.flatMap((f,i)=>frames.slice(i+1).filter(o=>overlap(f.box,o.box)).map(o=>[f.id,o.id]));
   return{svg:new XMLSerializer().serializeToString(el),width:Math.ceil(v.width),height:Math.ceil(v.height),labelNodeCollisions,labelLabelCollisions,frameExpansions,frameCollisions};
  },{source,id,groups});assert.deepEqual(errors,[]);assert.deepEqual(result.labelNodeCollisions,[]);assert.deepEqual(result.labelLabelCollisions,[]);assert.deepEqual(result.frameCollisions,[]);
  fs.writeFileSync(path.join(dir,id+'.svg'),result.svg+'\n');await page.locator('#diagram').screenshot({path:path.join(dir,id+'.png')});fs.copyFileSync(path.join(dir,id+'.png'),path.join(out,id+'.png'));
  const r={id,width:result.width,height:result.height,parse:'Passed',render:'Passed',pageErrors:errors,labelNodeCollisions:result.labelNodeCollisions,labelLabelCollisions:result.labelLabelCollisions,frameExpansions:result.frameExpansions,frameCollisions:result.frameCollisions};results.push(r);console.log(JSON.stringify(r));await page.close();
 }
 const file=path.join(out,'render-results.json'),prior=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).filter(r=>!ids.includes(r.id)):[];fs.writeFileSync(file,JSON.stringify([...prior,...results].sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');
 const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});const all=['st-01',...fs.readdirSync(out).filter(f=>/^st-\d+\.png$/.test(f)).map(f=>f.slice(0,-4))];
 const cards=all.map(id=>'<article><h3>'+id+'</h3><img src="data:image/png;base64,'+fs.readFileSync(path.join(id==='st-01'?dir:out,id+'.png')).toString('base64')+'"></article>').join('');
 await page.setContent('<!doctype html><style>body{font:18px Arial;background:#eee}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{background:white;padding:15px}img{width:740px;height:650px;object-fit:contain}</style><main>'+cards+'</main>');await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.screenshot({path:path.join(process.env.TEMP,'state-standard-contact-sheet.png'),fullPage:true});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
