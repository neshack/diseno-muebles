// Concepto Mueble — galería de proyectos, nuevo, duplicar, exportar e importar
'use strict';
function renderGal(){
 $('galGrid').innerHTML=store.projects.map(p=>{
  const t=qTotals(p); // misma fuente que la pantalla Cotizar
  return`<div class="pcard" data-id="${esc(p.id)}">${p.thumb?`<img src="${esc(p.thumb)}" alt="Vista previa de ${esc(p.name)}" loading="lazy">`:`<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12L3 7M12 12v10"/></svg></div>`}
  <div class="pbody"><b>${esc(p.name)}</b><small>${esc(p.client)||'sin cliente'} · ${p.items.length} piezas</small>
  <div class="ptotal">${money(t.total)}</div>
  <div class="prow"><button class="icobtn accent" data-a="open">Abrir</button><button class="icobtn" data-a="quote">Cotizar</button><button class="icobtn" data-a="dup">Duplicar</button><button class="del" data-a="del">Borrar</button></div></div></div>`;}).join('');
 [...$('galGrid').children].forEach(c=>c.onclick=e=>{
  const id=c.dataset.id,a=e.target.closest('[data-a]')?.dataset.a||'open';
  if(a==='del'){if(store.projects.length===1)return alert('Debe quedar 1 proyecto');
   if(!confirm('¿Borrar proyecto?'))return;
   store.projects=store.projects.filter(p=>p.id!==id);if(curId===id)curId=store.projects[0].id;save();rebuild();renderGal();return;}
  if(a==='dup'){const s=JSON.parse(JSON.stringify(store.projects.find(p=>p.id===id)));s.id=uid();s.name+=' copia';s.thumb=null;s.quote=null;s.quoteManual=false;store.projects.push(s);curId=s.id;save();rebuild();renderGal();return;}
  curId=id;rebuild();go(a==='quote'?'quote':'design');
 });
}
$('btnNew').onclick=()=>{const s=store.settings;const p={id:uid(),name:'Proyecto '+(store.projects.length+1),client:'',items:[],extras:[],laborHours:s.hours,laborRate:s.rate,margin:s.margin,thumb:null,quote:null,quoteManual:false,quoteNote:'',showPrices:true};
 store.projects.push(p);curId=p.id;save();rebuild();renderGal();go('design');};
// ---------- archivo: exportar / importar ----------
$('btnExport').onclick=()=>{
 const b=new Blob([JSON.stringify(store,null,1)],{type:'application/json'});
 const a=document.createElement('a');a.download='concepto-mueble-'+new Date().toISOString().slice(0,10)+'.json';
 a.href=URL.createObjectURL(b);a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),4000);
};
$('btnImport').onclick=()=>$('fileImport').click();
$('fileImport').onchange=e=>{
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{try{
  const d=JSON.parse(r.result);
  if(!d||typeof d!=='object')throw 0;
  const hasAny=(d.projects||d.materials||d.templates);
  if(!hasAny)throw 0;
  let nP=0,nM=0,nT=0;
  (Array.isArray(d.projects)?d.projects:[]).forEach(raw=>{
   const p=normProject(raw);
   // sanitizar los items crudos ANTES de normalizar para descartar los inválidos
   p.items=(Array.isArray(raw.items)?raw.items:[]).map(sanitizeItem).filter(Boolean);
   if(!store.projects.some(q=>q.id===p.id)){store.projects.push(p);nP++;}
  });
  (Array.isArray(d.materials)?d.materials:[]).forEach(raw=>{
   if(!raw||typeof raw!=='object'||!raw.id||!raw.name)return;
   const m={id:String(raw.id).slice(0,48),name:String(raw.name).slice(0,80),
    unit:raw.unit==='hoja'?'hoja':'pza',price:Math.max(0,+raw.price||0),
    color:/^#[0-9a-fA-F]{6}$/.test(raw.color||'')?raw.color:'',grain:!!raw.grain};
   if(!store.materials.some(q=>q.id===m.id)){store.materials.push(m);nM++;}
  });
  (Array.isArray(d.templates)?d.templates:[]).forEach(raw=>{
   if(!raw||typeof raw!=='object'||!raw.name)return;
   const t=normTemplate(raw);
   if(!store.templates.some(q=>q.id===t.id)){store.templates.push(t);nT++;}
  });
  const total=nP+nM+nT;
  if(!total){alert('Nada nuevo: los proyectos, materiales y objetos del archivo ya están importados.');return;}
  if(nP)curId=store.projects[store.projects.length-1].id;
  save();if(sceneReady)rebuild();renderGal();
  alert(total+' elemento(s) importado(s)'+(nP?` — ${nP} proyecto(s)`:'')+(nM?` — ${nM} material(es)`:'')+(nT?` — ${nT} objeto(s)`:''));
 }catch{alert('Archivo no válido');}e.target.value='';};
 r.readAsText(f);
};
