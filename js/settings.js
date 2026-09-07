// Concepto Mueble — ajustes: negocio, valores por defecto, kerf, logotipo y tema
'use strict';
function renderAppLogo(){
 $('appLogo').innerHTML=store.settings.logo?`<img src="${esc(store.settings.logo)}" alt="Logotipo del negocio">`:`<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M3 11h18v7H3zM5 18v2M19 18v2"/></svg>`;
}
function renderSet(){
 const s=store.settings;
 $('setBiz').value=s.business||'';$('setRate').value=s.rate;$('setHours').value=s.hours;$('setMargin').value=s.margin;$('setValidity').value=s.validity;$('setKerf').value=s.kerf;
 $('logoPrev').src=s.logo||'';$('logoPrev').hidden=!s.logo;$('logoPrev').style.display=s.logo?'block':'none';
}
[['setBiz','business'],['setRate','rate'],['setHours','hours'],['setMargin','margin'],['setValidity','validity']].forEach(([id,k])=>$(id).addEventListener('change',()=>{store.settings[k]=id==='setBiz'?$(id).value.slice(0,80):Math.max(0,+$(id).value||0);save();renderAppLogo();}));
$('setKerf').addEventListener('change',()=>{store.settings.kerf=Math.max(0,+$('setKerf').value||0);save();renderCuts();});
$('btnLogo').onclick=()=>$('logoFile').click();
$('logoFile').onchange=e=>{
 const f=e.target.files[0];if(!f)return;
 const url=URL.createObjectURL(f);
 const im=new Image();
 im.onload=()=>{
  const k=Math.min(1,256/Math.max(im.width,im.height));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  store.settings.logo=c.toDataURL('image/png');save();renderSet();renderAppLogo();URL.revokeObjectURL(url);
 };
 im.onerror=()=>{alert('No se pudo leer la imagen');URL.revokeObjectURL(url);};
 im.src=url;e.target.value='';
};
$('btnLogoDel').onclick=()=>{store.settings.logo=null;save();renderSet();renderAppLogo();};
$('btnTheme').onclick=()=>{
 store.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
 document.documentElement.dataset.theme=store.theme;save();
 if(sceneReady)themeScene();
};
