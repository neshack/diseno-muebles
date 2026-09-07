// Concepto Mueble — lista de corte y anidado en hojas 1220×2440 mm
'use strict';
// rectángulos cortables; con "veta" el lado largo va a lo largo de la hoja y no se rota
function cutRects(items){
 return items.filter(i=>!i.noCut&&!isShaped(i)).map(i=>{
  const dims=[i.w,i.h,i.d].sort((x,y)=>y-x); // dims[0] = lado mayor
  const m=store.materials.find(x=>x.id===i.matId);
  const grain=!!(m&&m.grain);
  return{name:i.name,w:grain?dims[1]:dims[0],h:grain?dims[0]:dims[1],e:dims[2],grain};
 }).sort((p,q)=>q.h-p.h);
}
function packSheets(items){
 const rects=cutRects(items),sheets=[],skipped=[];
 const kerf=Math.max(0,+store.settings.kerf||0);
 const fresh=()=>({rows:[],used:0});
 for(const r of rects){
  const W=r.w+kerf,H=r.h+kerf;
  const fits=r.grain?(W<=SHEET.w&&H<=SHEET.h):(W<=SHEET.w&&H<=SHEET.h)||(H<=SHEET.w&&W<=SHEET.h);
  if(!fits){skipped.push(r.name);continue;}
  let placed=false;
  for(const s of sheets){if(tryPlace(s,r)){placed=true;break;}}
  if(!placed){const sh=fresh();sheets.push(sh);if(!tryPlace(sh,r))skipped.push(r.name);}
 }
 return{sheets,skipped};
 function tryPlace(s,r){
  // el kerf se suma a cada pieza para reservar el paso de sierra entre piezas
  const rots=r.grain?[false]:[false,true];
  for(const rot of rots){
   const w=rot?r.h:r.w,h=rot?r.w:r.h,ww=w+kerf,hh=h+kerf;
   if(ww>SHEET.w||hh>SHEET.h)continue;
   for(const row of s.rows){
    if(hh<=row.h&&row.x+ww<=SHEET.w){row.items.push({...r,w,h,x:row.x,y:row.y});row.x+=ww;s.used+=w*h;return true;}
   }
   const y=s.rows.reduce((a,row)=>a+row.h,0);
   if(y+hh<=SHEET.h){s.rows.push({x:ww,y,h:hh,items:[{...r,w,h,x:0,y}]});s.used+=w*h;return true;}
  }
  return false;
 }
}
// resumen legible de los cortes de una pieza (para listas y PDF)
function cutsSummary(it){
 if(!it.cuts||!it.cuts.length)return'';
 const h=it.cuts.filter(c=>c.t==='hole'),n=it.cuts.filter(c=>c.t==='notch'),parts=[];
 if(h.length)parts.push(h.length+(h.length>1?' perforaciones':' perforación')+' Ø'+[...new Set(h.map(c=>fmt(c.d)))].join('/'));
 if(n.length)parts.push(n.length+(n.length>1?' muescas':' muesca')+' '+[...new Set(n.map(c=>fmt(c.w)+'×'+fmt(c.h)))].join('/'));
 return parts.join(' · ');
}
function renderCuts(){
 const u=store.unit;
 document.querySelectorAll('.u').forEach(e=>e.textContent=u);
 $('uLab').textContent=u==='in'?'pulgadas':u;
 const rows=cutRects(cur().items);
 $('cutTable').innerHTML='<tr><th>Pieza</th><th>Corte</th><th>Esp.</th></tr>'+rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.w} × ${r.h}</td><td>${r.e}</td></tr>`).join('');
 $('miniCuts').innerHTML='<tr><th>Pieza</th><th>Medida</th></tr>'+cur().items.map(i=>{
  const ex=(i.measures||[]).map(m=>`${esc(m.name)}: ${fmt(m.val)}`).join(' · ');
  const cs=cutsSummary(i);
  return`<tr><td>${esc(i.name)}</td><td>${fmt(i.w)}×${fmt(i.h)}×${fmt(i.d)}${ex?`<br><small style="color:var(--mut)">${ex}</small>`:''}${cs?`<br><small style="color:var(--mut)">${esc(cs)}</small>`:''}</td></tr>`;}).join('');
 const{sheets,skipped}=packSheets(cur().items),area=SHEET.w*SHEET.h;
 const used=sheets.reduce((a,s)=>a+s.used,0);
 $('stSheets').textContent=sheets.length+' hoja(s)';
 $('stWaste').textContent=sheets.length?Math.round((1-used/(area*sheets.length))*100)+'%':'–';
 const warn=$('cutWarn');
 if(skipped.length){warn.hidden=false;
  warn.textContent='⚠ '+skipped.length+' pieza(s) no caben en la hoja de 1220×2440 mm y no se contaron: '+[...new Set(skipped)].slice(0,4).join(', ')+((new Set(skipped)).size>4?'…':'')+'. Revisa esas piezas aparte.';}
 else warn.hidden=true;
 $('sheetImgs').innerHTML='';
 sheets.forEach((s,i)=>{
  const w=document.createElement('div');w.className='sheet';
  w.innerHTML=`<div class="stat"><span>Hoja ${i+1}</span><b>${Math.round((1-s.used/area)*100)}% desperdicio</b></div>`;
  const cv=document.createElement('canvas');cv.width=610;cv.height=1220;w.appendChild(cv);$('sheetImgs').appendChild(w);
  const x=cv.getContext('2d'),k=610/SHEET.w;
  x.fillStyle='#fff';x.fillRect(0,0,610,1220);
  const pal=['#d99a4e','#7fb069','#5b8dd9','#c96f6f','#9a7fd9'];
  s.rows.forEach(row=>row.items.forEach((r,j)=>{
   x.fillStyle=pal[j%pal.length]+'66';x.strokeStyle='#333';
   x.fillRect(r.x*k,r.y*k,r.w*k,r.h*k);x.strokeRect(r.x*k,r.y*k,r.w*k,r.h*k);
   if(r.w*k>60&&r.h*k>22){x.fillStyle='#111';x.font='11px system-ui';x.fillText(r.w+'×'+r.h,r.x*k+4,r.y*k+14);}
  }));
 });
}
