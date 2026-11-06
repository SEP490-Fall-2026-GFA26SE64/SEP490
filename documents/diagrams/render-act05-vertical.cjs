// Fixed vertical layout for the labels and exact edges in act-05.mmd.
// node documents/diagrams/render-act05-vertical.cjs <mermaid.min.js> [chrome.exe]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),assets=path.join(__dirname,'mermaid');
const source=fs.readFileSync(path.join(assets,'act-05.mmd'),'utf8');
const cfg=JSON.parse(source.split('\n').find(l=>l.startsWith('config: ')).slice(8)),c=cfg.themeVariables;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function wrap(s,max){const lines=[];let line='';for(const word of s.split(/\s+/)){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
const nodes=new Map(),routes=new Map();
for(const line of source.split('\n')){const m=line.match(/^\s*(\w+)(\[|\{|\(\()"(.*?)"/);if(!m)continue;const[,id,shape,html]=m;
 const kind=shape==='['?'action':shape==='{'?'decision':'terminal';
 const lines=html.split(/<br\s*\/?\s*>/).flatMap(s=>wrap(s.replace(/<[^>]+>/g,'').replaceAll('&amp;','&'),kind==='decision'?28:38));
 nodes.set(id,{id,kind,lines,w:kind==='terminal'?70:kind==='decision'?280:340,h:kind==='terminal'?70:kind==='decision'?220:lines.length*22+28});
}
const edges=source.split('\n').filter(l=>l.includes('-->')).flatMap(l=>{const p=l.trim().split(/\s*-->\s*/),ids=p.map(s=>s.replace(/^\|[^|]+\|\s*/,'').trim());return ids.slice(1).map((to,i)=>({from:ids[i],to,label:p[i+1].match(/^\|([^|]+)\|/)?.[1]||''}));});
const n=id=>{assert(nodes.has(id),id);return nodes.get(id);},place=(id,x,y)=>Object.assign(n(id),{x,y});
const top=id=>[n(id).x,n(id).y-n(id).h/2],bottom=id=>[n(id).x,n(id).y+n(id).h/2],left=id=>[n(id).x-n(id).w/2,n(id).y],right=id=>[n(id).x+n(id).w/2,n(id).y];
const key=(a,b)=>a+'>'+b,route=(a,b,points,label)=>routes.set(key(a,b),{points,label});
const main=['start','configure','validConfig','activate','choose','activeConfig','baseline','score','validResult','profile','reviewProfile','needs','generate','generated','expert','ready','approve','blocking','study','recalculate','unresolved'];
let cursor=56;for(const id of main){place(id,640,cursor+n(id).h/2);cursor+=n(id).h+32;}
for(const[b,a,end]of[['configError','validConfig'],['unavailable','activeConfig','unavailableEnd'],['invalid','validResult','invalidEnd'],['failed','generated','failureEnd']]){place(b,1100,n(a).y);if(end)place(end,1100,n(b).y+n(b).h/2+90);}
place('bypassReview',1100,n('unresolved').y);place('bypassed',640,n('unresolved').y+350);
place('completed',450,n('bypassed').y+210);place('released',1100,n('completed').y);
place('change',640,n('completed').y+210);place('newRole',640,n('change').y+190);place('finish',1100,n('change').y);
for(let i=1;i<main.length;i++)route(main[i-1],main[i],[bottom(main[i-1]),top(main[i])]);
for(const[a,b]of[['validConfig','configError'],['activeConfig','unavailable'],['validResult','invalid'],['generated','failed'],['unresolved','bypassReview'],['change','finish']])route(a,b,[right(a),left(b)],[right(a)[0]+38,n(a).y-12]);
route('configError','configure',[top('configError'),[1100,n('configure').y],right('configure')]);
for(const[a,b]of[['unavailable','unavailableEnd'],['invalid','invalidEnd'],['failed','failureEnd']])route(a,b,[bottom(a),top(b)]);
route('ready','expert',[left('ready'),[370,n('ready').y],[370,n('expert').y],left('expert')],[400,n('ready').y-12]);
route('needs','completed',[left('needs'),[160,n('needs').y],[160,n('completed').y],left('completed')],[left('needs')[0]-40,n('needs').y-12]);
route('blocking','bypassed',[right('blocking'),[1370,n('blocking').y],[1370,top('bypassed')[1]-55],[640,top('bypassed')[1]-55],top('bypassed')],[right('blocking')[0]+40,n('blocking').y-12]);
route('unresolved','blocking',[left('unresolved'),[300,n('unresolved').y],[300,n('blocking').y],left('blocking')],[left('unresolved')[0]-40,n('unresolved').y-12]);
const loopY=Math.max(bottom('bypassReview')[1]+55,bottom('unresolved')[1]+40);
route('bypassReview','blocking',[bottom('bypassReview'),[1100,loopY],[300,loopY],[300,n('blocking').y],left('blocking')]);
route('bypassed','completed',[left('bypassed'),[450,n('bypassed').y],top('completed')],[470,n('bypassed').y-12]);
route('bypassed','released',[right('bypassed'),[1100,n('bypassed').y],top('released')],[right('bypassed')[0]+40,n('bypassed').y-12]);
const mergeY=top('change')[1]-55;for(const id of ['completed','released'])route(id,'change',[bottom(id),[n(id).x,mergeY],[640,mergeY],top('change')]);
route('change','newRole',[bottom('change'),top('newRole')]);
route('newRole','activeConfig',[bottom('newRole'),[640,bottom('newRole')[1]+70],[60,bottom('newRole')[1]+70],[60,n('activeConfig').y],left('activeConfig')]);
for(const e of edges)assert(routes.has(key(e.from,e.to)),'Missing route '+key(e.from,e.to));assert.equal(routes.size,edges.length);assert([...nodes.values()].every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
// Keep every orthogonal edge out of all unrelated node bounding boxes.
for(const e of edges){const points=routes.get(key(e.from,e.to)).points;for(let i=1;i<points.length;i++){
 const[a,b]=[points[i-1],points[i]];assert(a[0]===b[0]||a[1]===b[1],'Non-orthogonal edge');
 for(const box of nodes.values()){if(box.id===e.from||box.id===e.to)continue;const x1=box.x-box.w/2+1,x2=box.x+box.w/2-1,y1=box.y-box.h/2+1,y2=box.y+box.h/2-1;
  const crosses=a[0]===b[0]?a[0]>x1&&a[0]<x2&&Math.max(a[1],b[1])>y1&&Math.min(a[1],b[1])<y2:a[1]>y1&&a[1]<y2&&Math.max(a[0],b[0])>x1&&Math.min(a[0],b[0])<x2;
  assert(!crosses,key(e.from,e.to)+' crosses '+box.id);
 }
}}
const width=1450,height=Math.ceil(bottom('newRole')[1]+120);
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">ACT-05 - Role-Level Baseline, Profile and Adaptive Learning</title><rect width="100%" height="100%" fill="${c.background}"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c.lineColor}"/></marker></defs><g font-family="Segoe UI, Arial, sans-serif" fill="${c.textColor}"><text x="725" y="28" font-size="20" text-anchor="middle">ACT-05 - Role-Level Baseline, Profile and Adaptive Learning</text>`;
for(const e of edges){const r=routes.get(key(e.from,e.to)),d=r.points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');svg+=`<path data-edge="${key(e.from,e.to)}" d="${d}" fill="none" stroke="${c.lineColor}" stroke-width="1.2" marker-end="url(#arrow)"/>`;
 if(e.label){const[x,y]=r.label||[r.points[0][0]+24,r.points[0][1]+25];svg+=`<text x="${x}" y="${y}" font-size="15" text-anchor="middle" style="paint-order:stroke;stroke:white;stroke-width:5px;stroke-linejoin:round">${esc(e.label)}</text>`;}}
for(const a of nodes.values()){const x=a.x-a.w/2,y=a.y-a.h/2;svg+=`<g data-node="${a.id}">`;
 if(a.kind==='terminal')svg+=`<circle cx="${a.x}" cy="${a.y}" r="35" fill="#c24a0a" stroke="#c24a0a" stroke-width="1.5"/>`;
 else if(a.kind==='decision')svg+=`<polygon points="${a.x},${y} ${x+a.w},${a.y} ${a.x},${y+a.h} ${x},${a.y}" fill="${c.noteBkgColor}" stroke="${c.noteBorderColor}" stroke-width="1.5"/>`;
 else svg+=`<rect x="${x}" y="${y}" width="${a.w}" height="${a.h}" rx="8" fill="${c.mainBkg}" stroke="${c.lineColor}" stroke-width="1"/>`;
 const first=a.y-(a.lines.length-1)*11+6;a.lines.forEach((line,i)=>svg+=`<text x="${a.x}" y="${first+i*22}" text-anchor="middle" font-size="16"${i===0?' font-weight="700"':''}${a.kind==='terminal'?' fill="#ffffff"':''}>${esc(line)}</text>`);svg+='</g>';}
svg+='</g></svg>\n';
const{chromium}=require(path.join(root,'frontend/node_modules/@playwright/test'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width,height:1200},deviceScaleFactor:1});await page.setContent('<!doctype html><style>body{margin:0}</style>');await page.addScriptTag({path:path.resolve(process.argv[2])});
 await page.evaluate(async s=>{mermaid.initialize({startOnLoad:false});await mermaid.parse(s);},source);
 await page.setContent('<!doctype html><meta charset="UTF-8"><style>body{margin:0;background:white}svg{display:block}</style>'+svg);await page.evaluate(()=>document.fonts.ready);
 const oversized=await page.locator('[data-node]').evaluateAll(groups=>groups.flatMap(g=>{const b=g.querySelector('rect,polygon,circle').getBoundingClientRect();return[...g.querySelectorAll('text')].filter(t=>{const r=t.getBoundingClientRect();return r.left<b.left||r.right>b.right||r.top<b.top||r.bottom>b.bottom;}).map(t=>g.dataset.node+': '+t.textContent);}));assert.deepEqual(oversized,[],'Text outside node');
 fs.writeFileSync(path.join(assets,'act-05.svg'),svg);await page.locator('svg').screenshot({path:path.join(assets,'act-05.png')});
 fs.copyFileSync(path.join(assets,'act-05.svg'),path.join(assets,'act-05-vertical-20261106.svg'));
 fs.copyFileSync(path.join(assets,'act-05.png'),path.join(assets,'act-05-vertical-20261106.png'));
 for(let y=0;y<height;y+=1400){await page.setViewportSize({width,height:Math.min(1400,height-y)});await page.evaluate(y=>scrollTo(0,y),y);await page.screenshot({path:path.join(process.env.TEMP,'act05-vertical-'+Math.floor(y/1400)+'.png')});}
 console.log(JSON.stringify({width,height,nodes:nodes.size,edges:edges.length,mermaidParse:'Passed',routeCoverage:'Passed',edgeNodeClearance:'Passed',textBounds:'Passed'}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
