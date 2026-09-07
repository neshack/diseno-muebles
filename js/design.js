// Concepto Mueble — pantalla Diseñar: panel de piezas, inspector, teclado y deshacer
'use strict';
// ---------- deshacer / rehacer ----------
const undoStack=[],redoStack=[];let lastUndoLabel='',lastUndoTime=0;
const snapshot=()=>JSON.stringify({id:curId,items:cur().items});
function commitSnap(snap){undoStack.push(snap);if(undoStack.length>60)undoStack.shift();redoStack.length=0;}
function pushUndo(label){
 const now=Date.now();
 if(label&&label===lastUndoLabel&&now-lastUndoTime<700){lastUndoTime=now;return;} // agrupa ráfagas (teclado)
 lastUndoLabel=label||'';lastUndoTime=now;
 commitSnap(snapshot());
}
function applySnap(s){try{const o=JSON.parse(s);const p=store.projects.find(x=>x.id===o.id);if(!p)return;p.items=o.items;curId=o.id;rebuild();save();}catch{}}
function doUndo(){if(!undoStack.length)return;redoStack.push(snapshot());applySnap(undoStack.pop());lastUndoLabel='';}
function doRedo(){if(!redoStack.length)return;undoStack.push(snapshot());applySnap(redoStack.pop());lastUndoLabel='';}
// ---------- panel pieza / listas ----------
function fillPanel(it){
 if(!it){$('pTitle').textContent='—';['pName','pW','pH','pD','pX','pY','pZ'].forEach(i=>$(i).value='');renderMeasures(null);renderCutsUI(null);return;}
 $('pTitle').textContent=(it.name||'Pieza')+(sel.length>1?' +'+(sel.length-1):'');
 $('pName').value=it.name||'';
 $('pW').value=fmt(it.w);$('pH').value=fmt(it.h);$('pD').value=fmt(it.d);
 $('pX').value=fmt(it.x);$('pY').value=fmt(it.y);$('pZ').value=fmt(it.z);
 $('pMat').value=it.matId||defMat();refreshSw(it.color);
 // el listado de medidas solo se re-dibuja si cambió la pieza o la unidad:
 // en arrastres del gizmo fillPanel corre por frame y no hay que tocar el DOM
 if(measFor!==it||measUnit!==store.unit)renderMeasures(it);
 if(cutsFor!==it||cutsUnit!==store.unit)renderCutsUI(it);
}
let measFor=null,measUnit='';
// ---------- medidas personalizadas (las que pida el usuario, por pieza) ----------
function renderMeasures(it){
 measFor=it||null;measUnit=store.unit;
 const box=$('pMeasures'),add=$('btnAddMeasure');
 if(!it){box.innerHTML='<small style="color:var(--mut)">Selecciona una pieza para añadir medidas.</small>';add.style.display='none';return;}
 add.style.display='';
 const list=it.measures||[];
 box.innerHTML=list.length?list.map((m,i)=>`<div class="mrow"><input data-mn="${i}" type="text" maxlength="40" placeholder="Nombre (ej. Diámetro)" value="${esc(m.name)}" aria-label="Nombre de la medida ${i+1}"><div class="inwrap"><input data-mv="${i}" type="text" inputmode="decimal" value="${fmt(m.val)}" aria-label="Valor de la medida ${i+1}"><span class="u">${store.unit}</span></div><button class="del" type="button" data-mdel="${i}" aria-label="Quitar medida ${i+1}" title="Quitar medida">×</button></div>`).join(''):'<small style="color:var(--mut)">Sin medidas extra — añade las que necesites (ej. Diámetro, Holgura).</small>';
}
$('btnAddMeasure').onclick=()=>{
 const m=tCtrl.object;if(!m)return alert('Selecciona una pieza primero');
 const it=m.userData.item;if(!Array.isArray(it.measures))it.measures=[];
 if(it.measures.length>=12)return alert('Máximo 12 medidas por pieza');
 pushUndo('añadir medida');
 it.measures.push({name:'Medida '+(it.measures.length+1),val:0});
 renderMeasures(it);renderCuts();scheduleSave();
 const names=$('pMeasures').querySelectorAll('[data-mn]');if(names.length)names[names.length-1].focus();
};
$('pMeasures').addEventListener('change',e=>{
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 const ni=e.target.dataset.mn,nv=e.target.dataset.mv;
 if(ni===undefined&&nv===undefined)return;
 if(!Array.isArray(it.measures))it.measures=[];
 const i=+(ni??nv),r=it.measures[i]||(it.measures[i]={name:'Medida',val:0});
 pushUndo('medida extra');
 if(ni!==undefined)r.name=e.target.value.slice(0,40);
 else r.val=Math.round(parse(e.target.value)*100)/100;
 renderCuts();scheduleSave();
});
$('pMeasures').addEventListener('click',e=>{
 const b=e.target.closest('[data-mdel]');if(!b)return;
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 pushUndo('quitar medida');
 it.measures.splice(+b.dataset.mdel,1);
 renderMeasures(it);renderCuts();scheduleSave();
});
[['pW','w'],['pH','h'],['pD','d'],['pX','x'],['pY','y'],['pZ','z']].forEach(([id,k])=>$(id).addEventListener('change',()=>{
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 pushUndo('medida');
 it[k]=Math.round(parse($(id).value));
 applyToMesh(it);renderCuts();scheduleSave();
}));
$('pName').addEventListener('change',()=>{const m=tCtrl.object;if(m){pushUndo('nombre');m.userData.item.name=$('pName').value.slice(0,80);$('pTitle').textContent=m.userData.item.name+(sel.length>1?' +'+(sel.length-1):'');renderCuts();scheduleSave();}});
$('pMat').addEventListener('change',()=>{const list=sel.length?sel:(tCtrl.object?[tCtrl.object]:[]);if(!list.length)return;
 pushUndo('material');
 list.forEach(m=>{m.userData.item.matId=$('pMat').value;
  const mm=mat(m.userData.item.matId);if(mm&&mm.color){m.userData.item.color=mm.color;m.material.color.set(mm.color);}});
 const p=primary();if(p)refreshSw(p.userData.item.color);
 renderCuts();scheduleSave();});
const sw=$('sw');PALETTE.forEach(c=>{const d=document.createElement('button');d.type='button';d.className='sw';d.style.background=c;d.dataset.c=c;d.setAttribute('aria-label','Color '+c);
 d.onclick=()=>{const list=sel.length?sel:(tCtrl.object?[tCtrl.object]:[]);if(!list.length)return;
  list.forEach(m=>{m.userData.item.color=c;m.material.color.set(c);});refreshSw(c);scheduleSave();};sw.appendChild(d);});
function refreshSw(c){[...sw.children].forEach(d=>d.classList.toggle('sel',d.dataset.c===c))}
function refreshAll(){
 $('projName').value=cur().name;$('clientName').value=cur().client||'';
 $('hSub').textContent=cur().name+(cur().client?' · '+cur().client:'');
 document.querySelectorAll('#unitSeg button').forEach(b=>{const on=b.dataset.u===store.unit;b.classList.toggle('on',on);if(on)b.setAttribute('aria-pressed','true');else b.removeAttribute('aria-pressed');});
 $('partsList').innerHTML=cur().items.length?cur().items.map((i,n)=>`<button type="button" class="card" data-n="${n}"><b>${esc(i.name)}</b><br><small>${fmt(i.w)} × ${fmt(i.h)} × ${fmt(i.d)} ${store.unit} · ${esc(mat(i.matId).name)}</small></button>`).join(''):'<small style="color:var(--mut)">Sin piezas — añade una tabla con + o inserta un objeto de la librería.</small>';
 [...$('partsList').children].forEach(d=>d.onclick=e=>{const m=meshes[+d.dataset.n];if(!m)return;
  if(e.shiftKey||e.ctrlKey||e.metaKey)toggleSel(m);else setSel([m]);});
 renderTpls();renderCuts();renderMats();syncSelUI();
 if(tCtrl.object)fillPanel(tCtrl.object.userData.item);
 updateDims();
}
let saveTimer;const scheduleSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{save();refreshAll();},400)};
// ---------- teclado ----------
addEventListener('keydown',e=>{
 const aEl=document.activeElement,tag=aEl?aEl.tagName:'';
 const typing=tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||(aEl&&aEl.isContentEditable);
 const designOn=$('s-design').classList.contains('on');
 // deshacer/rehacer (fuera de campos de texto)
 if(!typing&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey){
  if(!designOn)return;e.preventDefault();doUndo();return;}
 if(!typing&&(e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){
  if(!designOn)return;e.preventDefault();doRedo();return;}
 if(!designOn)return; // los atajos de edición solo actúan dentro de Diseñar
 if(e.key==='Escape'){closeDockMenu();closeChips();$('drawer').classList.remove('open');$('notch').setAttribute('aria-expanded','false');setSel([]);return;}
 if(typing)return;
 if((e.ctrlKey||e.metaKey)&&(e.key==='a'||e.key==='A')){e.preventDefault();setSel(meshes.slice());return;}
 // con el foco en un botón, Supr/Backspace no borra piezas (evita borrados accidentales)
 if(tag==='BUTTON'&&(e.key==='Delete'||e.key==='Backspace'))return;
 const list=sel.length?sel:(tCtrl.object?[tCtrl.object]:[]);
 if(!list.length)return;
 // rotaciones rápidas: Q/E giran 90° sobre el eje vertical, R quita la rotación
 if(e.key==='q'||e.key==='Q'){e.preventDefault();rotateSel('y',-90);return;}
 if(e.key==='e'||e.key==='E'){e.preventDefault();rotateSel('y',90);return;}
 if(e.key==='r'||e.key==='R'){e.preventDefault();$('btnRot0').click();return;}
 const st=e.shiftKey?100:10;let used=true;
 const mv=fn=>{pushUndo('teclado');list.forEach(m=>{const it=m.userData.item;fn(it);applyToMesh(it);});};
 if(e.key==='ArrowLeft')mv(it=>it.x-=st);
 else if(e.key==='ArrowRight')mv(it=>it.x+=st);
 else if(e.key==='ArrowUp')mv(it=>it.z-=st);
 else if(e.key==='ArrowDown')mv(it=>it.z+=st);
 else if(e.key==='PageUp')mv(it=>it.y+=st);
 else if(e.key==='PageDown')mv(it=>it.y=Math.max(0,it.y-st));
 else if((e.key==='Delete'||e.key==='Backspace')&&!e.metaKey&&!e.ctrlKey){deleteSel();}
 else used=false;
 if(used){e.preventDefault();const p=primary();if(p)fillPanel(p.userData.item);renderCuts();scheduleSave();}
});
// ---------- herramientas (funciones compartidas por los menús del dock) ----------
function addTabla(){pushUndo('añadir');
 const it=Object.assign(B('Tabla '+(cur().items.length+1),COLORS[0]),{w:600,h:800,d:40,x:0,y:400,z:0,matId:defMat()});
 cur().items.push(it);setSel([addMesh(it)]);renderCuts();fitAll();scheduleSave();}
function deleteSel(){const list=sel.length?sel.slice():(tCtrl.object?[tCtrl.object]:[]);if(!list.length)return;
 pushUndo('eliminar');
 cur().items=cur().items.filter(i=>!list.some(m=>m.userData.item===i));
 list.forEach(m=>scene.remove(m));
 meshes=meshes.filter(x=>!list.includes(x));
 setSel([]);renderCuts();scheduleSave();}
function dupSel(){const list=sel.length?sel.slice():(tCtrl.object?[tCtrl.object]:[]);if(!list.length)return;
 pushUndo('duplicar');
 const clones=list.map(m=>{const it=m.userData.item;
  const c={...it,name:(it.name+' copia').slice(0,80),x:it.x+100,measures:(it.measures||[]).map(x=>({...x})),cuts:(it.cuts||[]).map(x=>({...x}))};
  cur().items.push(c);return addMesh(c);});
 setSel(clones);renderCuts();scheduleSave();}
const toggleMarquee=()=>{marqueeSel=!marqueeSel;};
const selAll=()=>setSel(meshes.slice());
const selNone=()=>setSel([]);
[['mMove','translate'],['mRot','rotate'],['mScale','scale']].forEach(([id,mo])=>$(id).onclick=()=>{
 tCtrl.setMode(mo);['mMove','mRot','mScale'].forEach(i=>{$(i).classList.remove('on');$(i).removeAttribute('aria-pressed');});$(id).classList.add('on');$(id).setAttribute('aria-pressed','true');});
document.querySelectorAll('#dChips button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('#dChips button').forEach(x=>{x.classList.remove('on');x.removeAttribute('aria-pressed');});b.classList.add('on');b.setAttribute('aria-pressed','true');
 document.querySelectorAll('#dPanel .pane').forEach(p=>p.hidden=true);$('pane-'+b.dataset.t).hidden=false;
 $('dPanel').classList.add('open');syncPanelBtns();if(sceneReady)size();
 $('dChips').classList.remove('open');$('tgChips').setAttribute('aria-expanded','false');
});
// menú flotante de secciones (Piezas/Librería/Cortes): se despliega bajo su
// botón sobre el lienzo y se cierra al elegir, tocar el lienzo o con Escape
$('tgChips').onclick=()=>{const o=$('dChips').classList.toggle('open');$('tgChips').setAttribute('aria-expanded',o);};
const closeChips=()=>{if(!$('dChips').classList.contains('open'))return;$('dChips').classList.remove('open');$('tgChips').setAttribute('aria-expanded','false');};
$('view').addEventListener('pointerdown',e=>{if(!e.target.closest('#dChips,#tgChips'))closeChips();},true);
// paneles plegables: botón flotante sobre el lienzo o la × de la cabecera;
// en pantallas chicas son excluyentes (una hoja a la vez) y al cambiar el ancho
// del lienzo hay que redimensionar el render 3D
const syncPanelBtns=()=>{
 $('tgPanel').setAttribute('aria-expanded',$('dPanel').classList.contains('open'));
 $('tgInsp').setAttribute('aria-expanded',$('inspector').classList.contains('open'));};
const afterPanel=()=>{syncPanelBtns();if(sceneReady)size();};
$('tgPanel').onclick=()=>{$('dPanel').classList.toggle('open');if(innerWidth<861)$('inspector').classList.remove('open');afterPanel();};
$('tgInsp').onclick=()=>{$('inspector').classList.toggle('open');if(innerWidth<861)$('dPanel').classList.remove('open');afterPanel();};
document.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{$(b.dataset.cp).classList.remove('open');afterPanel();});
// ---------- menús agrupados del dock (Crear / Selección / Acciones) ----------
const DOCK_MENUS={
 ddAdd:()=>[
  {l:'Tabla',fn:addTabla},
  {l:'Broca Ø8 (perforación)',fn:()=>addCutterObj('hole',8)},
  {l:'Broca Ø15 (perforación)',fn:()=>addCutterObj('hole',15)},
  {l:'Broca Ø32 (perforación)',fn:()=>addCutterObj('hole',32)},
  {l:'Muesca 60×30 (tajo)',fn:()=>addCutterObj('notch',60,30)},
  {l:'Librería…',fn:()=>document.querySelector('#dChips button[data-t=lib]').click()}],
 ddSel:()=>[
  {l:'Selección por rectángulo',chk:marqueeSel,fn:toggleMarquee},
  {l:'Seleccionar todo',fn:selAll},
  {l:'Quitar selección',fn:selNone}],
 ddAct:()=>[
  {l:'Duplicar',fn:dupSel},
  {l:'Perforar con objeto',fn:applyCutters},
  {l:'Eliminar selección',fn:deleteSel,danger:true}]
};
let openDd=null;
function closeDockMenu(){if(openDd===null)return;$('dockMenu').hidden=true;openDd=null;
 document.querySelectorAll('#drawer .ddbtn').forEach(b=>b.removeAttribute('aria-expanded'));}
function openDockMenu(id,btn){
 const items=DOCK_MENUS[id](),menu=$('dockMenu');
 document.querySelectorAll('#drawer .ddbtn').forEach(b=>{if(b!==btn)b.removeAttribute('aria-expanded');});
 menu.hidden=false;openDd=id;
 menu.innerHTML=items.map((it,i)=>`<button type="button" data-di="${i}"${it.danger?' class="danger"':''}>${it.chk?'✓ ':''}${esc(it.l)}</button>`).join('');
 [...menu.children].forEach(b=>b.onclick=()=>{const it=items[+b.dataset.di];closeDockMenu();it.fn();});
 const dr=$('drawer');
 menu.style.left=Math.max(6,Math.min(btn.offsetLeft,dr.clientWidth-menu.offsetWidth-6))+'px';
 btn.setAttribute('aria-expanded','true');
}
['ddAdd','ddSel','ddAct'].forEach(id=>$(id).onclick=()=>{openDd===id?closeDockMenu():openDockMenu(id,$(id));});
$('view').addEventListener('pointerdown',e=>{if(!e.target.closest('#dockMenu,.ddbtn'))closeDockMenu();},true);
// ---------- perforar con objeto: la broca/muesca se superpone y se consume ----------
// convierte cada objeto fantasma de la selección en cortes reales sobre las
// demás piezas seleccionadas (booleano) y elimina el objeto de corte
function applyCutters(){
 const list=sel.length?sel.slice():(tCtrl.object?[tCtrl.object]:[]);
 if(!window.CSG)return alert('El motor de cortes 3D no cargó (sin internet). Recarga la página con conexión para usar brocas y muescas.');
 const cutters=list.filter(m=>m.userData.item&&m.userData.item.ghost);
 const targets=list.filter(m=>!cutters.includes(m)&&!(m.userData.item&&m.userData.item.ghost));
 if(!cutters.length||!targets.length)return alert('Selecciona la pieza a perforar y también el objeto de corte (broca o muesca del menú Crear). Mayús o Control clic suma piezas a la selección; la pieza puede tener varios objetos de corte a la vez.');
 pushUndo('perforar con objeto');
 const q=new THREE.Quaternion(),inv=new THREE.Matrix4();
 let applied=0;
 cutters.forEach(cm=>{
  const cit=cm.userData.item,type=cit.shape==='cyl'?'hole':'notch';
  cm.getWorldQuaternion(q);
  const half=cit.h/2000; // mitad del largo del cortador, en metros
  const c0=new THREE.Vector3(0,-half,0).applyQuaternion(q).add(cm.position);
  const c1=new THREE.Vector3(0,half,0).applyQuaternion(q).add(cm.position);
  targets.forEach(tm=>{
   inv.copy(tm.matrixWorld).invert();
   // extremos del cortador llevados al espacio local de la pieza (mm, centro = 0)
   const p0=c0.clone().applyMatrix4(inv),p1=c1.clone().applyMatrix4(inv);
   const axisV=p1.clone().sub(p0);
   let ax=0;for(let i=1;i<3;i++)if(Math.abs(axisV.getComponent(i))>Math.abs(axisV.getComponent(ax)))ax=i;
   const axName=['x','y','z'][ax],PERP={x:[1,2],y:[0,2],z:[0,1]}[axName];
   const it=tm.userData.item,dim=[it.w,it.h,it.d][ax]/1000;
   const center=p0.clone().add(p1).multiplyScalar(.5);
   const ext=Math.abs(axisV.getComponent(ax));
   const lo=center.getComponent(ax)-ext/2,hi=center.getComponent(ax)+ext/2,plo=-dim/2,phi=dim/2;
   let p,side;
   if(lo<=plo+1e-4&&hi>=phi-1e-4){p=0;side='-';} // atraviesa: pasa de lado a lado
   else if(hi<=0){p=Math.round((hi-plo)*1000);side='-';}
   else if(lo>=0){p=Math.round((phi-lo)*1000);side='+';}
   else if(-lo>hi){p=Math.round((hi-plo)*1000);side='-';}
   else{p=Math.round((phi-lo)*1000);side='+';}
   const cut={t:type,ax:axName,p:Math.max(0,p),side,
    a:Math.max(-5000,Math.min(5000,Math.round(center.getComponent(PERP[0])*1000))),
    b:Math.max(-5000,Math.min(5000,Math.round(center.getComponent(PERP[1])*1000)))};
   if(type==='hole')cut.d=Math.max(1,Math.round(cit.w));
   else{ // caja: medidas transversales = extensión del cortador en cada eje (válido girado)
    const size=new THREE.Vector3(cit.w,cit.h,cit.d).multiplyScalar(1/1000);
    const sx=new THREE.Vector3(1,0,0).applyQuaternion(q).multiply(size);
    const sy=new THREE.Vector3(0,1,0).applyQuaternion(q).multiply(size);
    const sz=new THREE.Vector3(0,0,1).applyQuaternion(q).multiply(size);
    const span=i=>Math.round((Math.abs(sx.getComponent(i))+Math.abs(sy.getComponent(i))+Math.abs(sz.getComponent(i)))*1000);
    cut.w=Math.max(1,Math.min(5000,span(PERP[0])));
    cut.h=Math.max(1,Math.min(5000,span(PERP[1])));
   }
   if(!Array.isArray(it.cuts))it.cuts=[];
   if(it.cuts.length>=24)return;
   it.cuts.push(cut);applyToMesh(it);applied++;
  });
 });
 if(!applied){alert('Nada que cortar: superpón el objeto de corte a la pieza (y que no supere sus 24 cortes).');return;}
 cutters.forEach(disposeMesh);
 meshes=meshes.filter(m=>!cutters.includes(m));
 cur().items=cur().items.filter(i=>!cutters.some(cm=>cm.userData.item===i));
 setSel(targets);refreshAll();scheduleSave();
}
$('projName').onchange=e=>{cur().name=e.target.value.slice(0,80);save();refreshAll();};
$('clientName').onchange=e=>{cur().client=e.target.value.slice(0,80);save();refreshAll();};
document.querySelectorAll('#unitSeg button').forEach(b=>b.onclick=()=>{store.unit=b.dataset.u;save();refreshAll();});
// ---------- rotaciones rápidas (90°, toda la selección) ----------
// al girar, la pieza se re-apoya: la cara inferior queda a la misma altura que antes
function keepBottom(m,fn){
 const pre=new THREE.Box3().setFromObject(m);
 fn();m.updateMatrixWorld(true);
 const post=new THREE.Box3().setFromObject(m),it=m.userData.item;
 if(isFinite(pre.min.y)&&isFinite(post.min.y)){
  it.y=Math.max(0,Math.round(it.y+(pre.min.y-post.min.y)*1000));
  m.position.y=it.y/1000;}
}
const rotList=()=>sel.length?sel.slice():(tCtrl.object?[tCtrl.object]:[]);
function afterRot(){
 const p=primary();if(p)fillPanel(p.userData.item);
 updateDims();scheduleSave();
}
function rotateSel(ax,delta){
 const list=rotList();if(!list.length)return alert('Selecciona una pieza primero');
 pushUndo('rotar');
 list.forEach(m=>{const it=m.userData.item;
  keepBottom(m,()=>{it['r'+ax]=(((Math.round((it['r'+ax]||0)/90)*90+delta)%360)+360)%360;
   m.rotation.set(deg(it.rx),deg(it.ry),deg(it.rz));});});
 afterRot();
}
$('btnRot0').onclick=()=>{
 const list=rotList();if(!list.length)return alert('Selecciona una pieza primero');
 pushUndo('rotar');
 list.forEach(m=>{const it=m.userData.item;
  keepBottom(m,()=>{it.rx=0;it.ry=0;it.rz=0;m.rotation.set(0,0,0);});});
 afterRot();
};
document.querySelectorAll('#drawer [data-rr]').forEach(b=>b.onclick=()=>{const[ax,d]=b.dataset.rr.split(',');rotateSel(ax,+d);});
// ---------- muescas y perforaciones (se restan del sólido en 3D) ----------
let cutsFor=null,cutsUnit='';
const mmNum=v=>{const n=Math.round(parse(v));return isFinite(n)?n:0;};
function cutCard(c,i){
 const num=(f,l)=>`<div><label class="fl">${l}</label><div class="inwrap"><input data-ci="${i}" data-cf="${f}" type="text" inputmode="decimal" value="${fmt(c[f])}" aria-label="${l} del corte ${i+1}"></div></div>`;
 const selAx=['x','y','z'].map(a=>`<option value="${a}"${c.ax===a?' selected':''}>${a.toUpperCase()}</option>`).join('');
 const selSide=`<option value="-"${c.side!=='+'?' selected':''}>−</option><option value="+"${c.side==='+'?' selected':''}>+</option>`;
 const head=`<div class="cuthead"><b>${c.t==='hole'?'Perforación':'Muesca'}</b><span class="cutlbl">Eje</span><select data-ci="${i}" data-cf="ax" aria-label="Eje del corte ${i+1}">${selAx}</select><span class="cutlbl">Cara</span><select data-ci="${i}" data-cf="side" aria-label="Cara de entrada del corte ${i+1}">${selSide}</select><button class="del" type="button" data-cdel="${i}" title="Quitar" aria-label="Quitar corte ${i+1}">×</button></div>`;
 const fields=c.t==='hole'
  ?`<div class="dim3">${num('a','Pos. A')}${num('b','Pos. B')}${num('d','Ø')}</div><div class="dim3"><div>${num('p','Prof. (0 = pasante)')}</div></div>`
  :`<div class="dim3">${num('a','Pos. A')}${num('b','Pos. B')}</div><div class="dim3">${num('w','Ancho')}${num('h','Alto')}${num('p','Prof. (0 = pasante)')}</div>`;
 return`<div class="card cutc">${head}${fields}</div>`;
}
function renderCutsUI(it){
 cutsFor=it||null;cutsUnit=store.unit;
 const box=$('pCuts'),bh=$('btnAddHole'),bn=$('btnAddNotch');
 bh.style.display=bn.style.display=it?'':'none';
 if(!it){box.innerHTML='<small style="color:var(--mut)">Selecciona una pieza para añadir cortes.</small>';return;}
 const list=it.cuts||[];
 box.innerHTML=list.length?list.map(cutCard).join(''):'<small style="color:var(--mut)">Pieza maciza — añade perforaciones (redondas) o muescas (rectangulares) y se restarán del sólido.</small>';
}
function rebuildCuts(it){applyToMesh(it);renderCuts();scheduleSave();}
$('pCuts').addEventListener('change',e=>{
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 const i=e.target.dataset.ci,f=e.target.dataset.cf;
 if(i===undefined||!f)return;
 if(!Array.isArray(it.cuts))it.cuts=[];
 const c=it.cuts[+i];if(!c)return;
 pushUndo('editar corte');
 if(f==='ax')c.ax=['x','y','z'].includes(e.target.value)?e.target.value:'z';
 else if(f==='side')c.side=e.target.value==='+'?'+':'-';
 else if(f==='d'||f==='w'||f==='h')c[f]=Math.max(1,Math.min(5000,mmNum(e.target.value)));
 else if(f==='p')c.p=Math.max(0,Math.min(5000,mmNum(e.target.value)));
 else c[f]=Math.max(-5000,Math.min(5000,mmNum(e.target.value)));
 rebuildCuts(it);
});
$('pCuts').addEventListener('click',e=>{
 const b=e.target.closest('[data-cdel]');if(!b)return;
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 if(!Array.isArray(it.cuts))return;
 pushUndo('quitar corte');
 it.cuts.splice(+b.dataset.cdel,1);
 renderCutsUI(it);rebuildCuts(it);
});
function addCut(def,label){
 const m=tCtrl.object;if(!m)return alert('Selecciona una pieza primero');
 if(!window.CSG)return alert('El motor de cortes 3D no cargó (sin internet). Recarga la página con conexión para usar muescas y perforaciones.');
 const it=m.userData.item;if(!Array.isArray(it.cuts))it.cuts=[];
 if(it.cuts.length>=24)return alert('Máximo 24 cortes por pieza');
 pushUndo('añadir '+label);
 it.cuts.push(def);
 renderCutsUI(it);rebuildCuts(it);
}
$('btnAddHole').onclick=()=>addCut({t:'hole',ax:'z',a:0,b:0,d:8,w:20,h:20,p:0,side:'-'},'perforación');
$('btnAddNotch').onclick=()=>addCut({t:'notch',ax:'z',a:0,b:0,d:8,w:60,h:30,p:0,side:'-'},'muesca');
