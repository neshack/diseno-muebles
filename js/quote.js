// Concepto Mueble — presupuesto, cotización y exportación PDF/Word
'use strict';
function budget(p){
 const lines=[];
 const byMat={};
 p.items.forEach(i=>{const key=i.matId||(i.noCut?null:defMat());if(!key)return;(byMat[key]=byMat[key]||[]).push(i);});
 for(const[mid,list]of Object.entries(byMat)){
  const m=store.materials.find(x=>x.id===mid);if(!m)continue;
  if(m.unit==='hoja'){const n=packSheets(list).sheets.length;if(n)lines.push({concepto:`${m.name} (${n} hoja${n>1?'s':''})`,cant:n,precio:m.price});}
  else lines.push({concepto:`${m.name} (${list.length} pza)`,cant:list.length,precio:m.price});
 }
 (p.extras||[]).forEach(x=>lines.push({concepto:x.concepto,cant:x.cant,precio:x.precio,extra:true}));
 const labor=(p.laborHours||0)*(p.laborRate||0);
 if(labor)lines.push({concepto:`Mano de obra (${p.laborHours} h)`,cant:1,precio:labor});
 const sub=lines.reduce((a,l)=>a+l.cant*l.precio,0);
 const marg=sub*(p.margin||0)/100;
 return{lines,sub,marg,total:sub+marg};
}
// La cotización sigue al presupuesto automáticamente (quoteManual=false).
// Si el usuario edita líneas a mano queda congelada hasta "Recalcular auto".
// Así la galería y la pantalla Cotizar siempre muestran el mismo total.
function syncQuote(p){if(!p.quote||p.quoteManual===false)p.quote=JSON.parse(JSON.stringify(budget(p).lines));return p.quote;}
const qEnsure=syncQuote;
function qTotals(p){const sub=syncQuote(p).reduce((a,l)=>a+(+l.cant||0)*(+l.precio||0),0);const marg=sub*(p.margin||0)/100;return{sub,marg,total:sub+marg};}
function renderQuote(){
 $('qProj').innerHTML=store.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('qProj').value=curId;
 const p=cur(),L=syncQuote(p),t=qTotals(p);
 $('qTable').innerHTML='<tr><th>Concepto</th><th>Cant</th><th>P.unit</th><th>Total</th><th></th></tr>'+
  L.map((l,i)=>`<tr><td><input data-q="concepto" data-i="${i}" value="${esc(l.concepto)}" aria-label="Concepto línea ${i+1}"></td><td><input data-q="cant" data-i="${i}" type="number" min="0" value="${+l.cant||0}" aria-label="Cantidad línea ${i+1}"></td><td><input data-q="precio" data-i="${i}" type="number" min="0" value="${+l.precio||0}" aria-label="Precio unitario línea ${i+1}"></td><td>${money((+l.cant||0)*(+l.precio||0))}</td><td><button class="del" data-qd="${i}" aria-label="Eliminar línea ${i+1}">×</button></td></tr>`).join('')+
  `<tr><td colspan="3">Subtotal</td><td colspan="2">${money(t.sub)}</td></tr><tr><td colspan="3">Margen ${p.margin||0}%</td><td colspan="2">${money(t.marg)}</td></tr>`;
 $('qTotal').textContent=money(t.total);
 $('qHours').value=p.laborHours||0;$('qRate').value=p.laborRate||0;$('qMargin').value=p.margin||0;
 $('qNote').value=p.quoteNote||'';
 $('qPrices').checked=p.showPrices!==false;
 $('qPrices').onchange=()=>{cur().showPrices=$('qPrices').checked;save();};
 [...$('qTable').querySelectorAll('input[data-q]')].forEach(inp=>inp.onchange=()=>{
  const l=syncQuote(cur())[+inp.dataset.i];if(!l)return;
  l[inp.dataset.q]=inp.dataset.q==='concepto'?inp.value:+inp.value||0;
  cur().quoteManual=true;save();renderQuote();
 });
 [...$('qTable').querySelectorAll('[data-qd]')].forEach(btn=>btn.onclick=()=>{syncQuote(cur()).splice(+btn.dataset.qd,1);cur().quoteManual=true;save();renderQuote();});
 $('xList').innerHTML=(p.extras||[]).map((x,i)=>`<div class="stat"><span>${esc(x.concepto)} × ${x.cant} — ${money(x.precio)}</span><button class="del" data-x="${i}">quitar</button></div>`).join('');
 [...$('xList').querySelectorAll('[data-x]')].forEach(btn=>btn.onclick=()=>{p.extras.splice(+btn.dataset.x,1);p.quote=null;save();renderQuote();});
}
$('qProj').onchange=e=>{curId=e.target.value;rebuild();renderQuote();};
$('btnAddLine').onclick=()=>{syncQuote(cur()).push({concepto:'Nuevo concepto',cant:1,precio:0});cur().quoteManual=true;save();renderQuote();};
$('btnRegen').onclick=()=>{if(cur().quoteManual&&!confirm('¿Recalcular desde cero y perder los cambios manuales de la cotización?'))return;cur().quoteManual=false;cur().quote=null;save();renderQuote();};
$('qNote').addEventListener('change',()=>{cur().quoteNote=$('qNote').value;save();});
$('btnAddX').onclick=()=>{
 if(!$('xName').value||!+$('xPrice').value)return alert('Falta concepto o precio');
 cur().extras.push({concepto:$('xName').value.slice(0,80),cant:+$('xQty').value||1,precio:+$('xPrice').value});
 cur().quote=null;$('xName').value='';$('xPrice').value='';save();renderQuote();
};
[['qHours','laborHours'],['qRate','laborRate'],['qMargin','margin']].forEach(([id,k])=>$(id).addEventListener('change',()=>{cur()[k]=+$(id).value||0;cur().quote=null;cur().quoteManual=false;save();renderQuote();}));
$('btnQuotePDF').onclick=()=>{
 const p=cur(),L=syncQuote(p),t=qTotals(p),S=store.settings;
 const doc=jsPDFDoc({unit:'mm',format:'a4'});if(!doc)return;
 try{if(S.logo)doc.addImage(S.logo,S.logo.startsWith('data:image/png')?'PNG':'JPEG',14,6,16,16);}catch{}
 doc.setFontSize(20);doc.text('Concepto Mueble'+(S.business?' — '+S.business:''),S.logo?34:14,16);
 doc.setFontSize(13);doc.text('Cotización — '+p.name,14,25);
 doc.setFontSize(10);doc.text(`Cliente: ${p.client||'—'} · Fecha: ${new Date().toLocaleDateString()} · Vigencia: ${S.validity} días`,14,31);
 let y=41;doc.setFontSize(10);
 const sp=p.showPrices!==false;
 const newPage=()=>{doc.addPage();y=15;};
 if(sp){
  L.forEach(l=>{
   const wrap=doc.splitTextToSize(String(l.concepto||''),104);
   wrap.forEach((seg,i)=>{
    if(y>278)newPage();
    doc.text(seg,14,y);
    if(i===0){doc.text(String(+l.cant||0),126,y,{align:'right'});doc.text(money(+l.precio||0),158,y,{align:'right'});doc.text(money((+l.cant||0)*(+l.precio||0)),196,y,{align:'right'});}
    y+=6;
   });
  });
 }else{
  doc.text('Detalle de conceptos (precios al final):',14,y);y+=7;
  L.forEach(l=>{const wrap=doc.splitTextToSize('· '+String(l.concepto||'')+'  (cant. '+(+l.cant||0)+')',180);
   wrap.forEach(seg=>{if(y>278)newPage();doc.text(seg,14,y);y+=6;});});
 }
 if(p.quoteNote){y+=4;if(y>278)newPage();doc.text('Notas: '+p.quoteNote.slice(0,120),14,y);y+=8;}
 y+=4;if(y>278)newPage();
 doc.setFontSize(11);doc.text('Subtotal: '+money(t.sub),14,y);y+=7;
 doc.text(`Margen ${p.margin||0}%: `+money(t.marg),14,y);y+=8;
 if(y>282)newPage();
 doc.setFontSize(15);doc.text('TOTAL: '+money(t.total),14,y);
 doc.save('Cotizacion-'+safeName(p.name)+'.pdf');
};
$('btnWord').onclick=()=>{
 const p=cur(),L=syncQuote(p),t=qTotals(p),S=store.settings,sp=p.showPrices!==false;
 const rows=L.map(l=>sp?`<tr><td>${esc(l.concepto)}</td><td>${+l.cant||0}</td><td>${money(+l.precio||0)}</td><td>${money((+l.cant||0)*(+l.precio||0))}</td></tr>`:`<tr><td>${esc(l.concepto)}</td><td>${+l.cant||0}</td></tr>`).join('');
 const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"></head><body>${S.logo?`<img src="${S.logo}" width="90">`:''}<h1>Concepto Mueble${S.business?' — '+esc(S.business):''} — Cotización</h1><p><b>${esc(p.name)}</b> · Cliente: ${esc(p.client||'—')} · ${new Date().toLocaleDateString()} · Vigencia: ${S.validity} días</p><table border="1" cellpadding="6" cellspacing="0"><tr><th>Concepto</th><th>Cant</th>${sp?'<th>P. unit</th><th>Total</th>':''}</tr>${rows}</table>${sp?`<p>Subtotal: ${money(t.sub)}<br>Margen ${p.margin||0}%: ${money(t.marg)}<br>`:''}<b>TOTAL: ${money(t.total)}</b></p><p>${esc(p.quoteNote||'')}</p></body></html>`;
 const b=new Blob(['\ufeff'+html],{type:'application/msword'});
 const a=document.createElement('a');a.download='Cotizacion-'+safeName(p.name)+'.doc';a.href=URL.createObjectURL(b);a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),4000);
};
