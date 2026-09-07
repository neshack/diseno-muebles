// Concepto Mueble — administración de materiales
'use strict';
function renderMats(){
 $('matList').innerHTML=store.materials.map(m=>{
  const n=cur().items.filter(i=>(i.matId||defMat())===m.id).length;
  return`<div class="card"><b><span class="dot" style="background:${esc(m.color||'#888')}"></span>${esc(m.name)}</b><br>
  <small>${m.unit==='hoja'?'por hoja 1220×2440':'por pieza'} · en uso en ${n} pieza(s) de este proyecto</small>
  <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="color" data-mc="${esc(m.id)}" value="${esc(m.color||'#c89b6d')}" title="Color avanzado" aria-label="Color de ${esc(m.name)}"><div class="pal">${PALETTE.map(c=>`<button type="button" data-mcs="${esc(m.id)}|${c}" title="${c}" aria-label="Color ${c} para ${esc(m.name)}" style="background:${c}${c===(m.color||'')?';border-color:var(--txt)':''}"></button>`).join('')}</div></div>
  ${m.unit==='hoja'?`<label class="checkrow"><input type="checkbox" data-mg="${esc(m.id)}" ${m.grain?'checked':''}> Respetar veta: las piezas de este material no se rotan al anidar en la hoja</label>`:''}
  <div class="dim3" style="margin-top:6px"><div><label class="fl">Precio $</label><input type="number" data-mp="${esc(m.id)}" value="${+m.price||0}" aria-label="Precio de ${esc(m.name)}"></div>
  <div><label class="fl">Nombre</label><input type="text" data-mn="${esc(m.id)}" value="${esc(m.name)}" aria-label="Nombre del material" maxlength="80"></div>
  <div><label class="fl">&nbsp;</label><button class="del" data-md="${esc(m.id)}">Borrar</button></div></div></div>`;}).join('');
 [...$('matList').querySelectorAll('[data-mp]')].forEach(i=>i.onchange=()=>{const m=store.materials.find(x=>x.id===i.dataset.mp);if(m){m.price=+i.value||0;save();renderMats();}});
 [...$('matList').querySelectorAll('[data-mc]')].forEach(i=>i.onchange=()=>{const m=store.materials.find(x=>x.id===i.dataset.mc);if(m){m.color=i.value;save();renderMats();}});
 [...$('matList').querySelectorAll('[data-mcs]')].forEach(s=>s.onclick=()=>{const[id,c]=s.dataset.mcs.split('|');const m=store.materials.find(x=>x.id===id);if(m){m.color=c;save();renderMats();}});
 [...$('matList').querySelectorAll('[data-mg]')].forEach(c=>c.onchange=()=>{const m=store.materials.find(x=>x.id===c.dataset.mg);if(m){m.grain=c.checked;save();renderCuts();}});
 [...$('matList').querySelectorAll('[data-mn]')].forEach(i=>i.onchange=()=>{const m=store.materials.find(x=>x.id===i.dataset.mn);if(m&&i.value.trim()){m.name=i.value.trim().slice(0,80);save();renderMats();}});
 [...$('matList').querySelectorAll('[data-md]')].forEach(btn=>btn.onclick=()=>{
  if(store.materials.length===1)return alert('Debe quedar 1 material');
  if(!confirm('¿Borrar material? Las piezas que lo usan pasarán al material por defecto.'))return;
  const id=btn.dataset.md;
  store.projects.forEach(p=>p.items.forEach(i=>{if(i.matId===id)i.matId=defMat();}));
  store.materials=store.materials.filter(m=>m.id!==id);save();rebuild();renderMats();
 });
 const pm=$('pMat');if(pm)pm.innerHTML=store.materials.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} — $${+m.price||0}/${m.unit}</option>`).join('');
 $('mPal').innerHTML=PALETTE.map(c=>`<button type="button" data-c="${c}" aria-label="Elegir color ${c}" style="background:${c}"></button>`).join('');
 [...$('mPal').children].forEach(s=>s.onclick=()=>{$('mColor').value=s.dataset.c;[...$('mPal').children].forEach(x=>x.style.borderColor='transparent');s.style.borderColor='var(--txt)';});
}
$('btnAddMat').onclick=()=>{
 if(!$('mName').value.trim())return alert('Falta nombre');
 store.materials.push({id:uid(),name:$('mName').value.trim().slice(0,80),unit:$('mUnit').value==='hoja'?'hoja':'pza',price:Math.max(0,+$('mPrice').value||0),color:$('mColor').value,grain:false});
 $('mName').value='';$('mPrice').value='';save();renderMats();
};
