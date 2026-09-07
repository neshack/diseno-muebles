// Concepto Mueble — navegación, arranque y utilidades compartidas finales
'use strict';
function jsPDFDoc(opts){
 if(!window.jspdf||!window.jspdf.jsPDF){
  alert('No se pudo cargar el generador PDF. Revisa tu conexión a internet e inténtalo de nuevo.');
  return null;}
 return new window.jspdf.jsPDF(opts);
}
function bootFail(msg){
 const b=$('bootError');if(!b)return;
 b.hidden=false;b.querySelector('p').textContent=msg;
 // sin motor 3D la app no puede editarse: bloquea la navegación y deja los datos a salvo
 document.querySelectorAll('nav button,header button,.galhead button').forEach(x=>{x.disabled=true;x.style.opacity=.4;});
}
// ---------- navegación ----------
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
 if(b.dataset.s!=='design'&&$('s-design').classList.contains('on')){captureThumb();save();}
 document.querySelectorAll('nav button').forEach(x=>{x.classList.remove('on');x.removeAttribute('aria-current');});b.classList.add('on');b.setAttribute('aria-current','page');
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
 $('s-'+b.dataset.s).classList.add('on');
 if(b.dataset.s==='design'&&sceneReady)size();
 if(b.dataset.s==='gal')renderGal();
 if(b.dataset.s==='quote')renderQuote();
 if(b.dataset.s==='set')renderSet();
});
const go=s=>document.querySelector(`nav button[data-s=${s}]`).click();
addEventListener('resize',()=>{if(sceneReady)size();});
document.addEventListener('fullscreenchange',()=>setTimeout(()=>{if(sceneReady)size();},80));
// guarda y actualiza la miniatura al cerrar o recargar
addEventListener('beforeunload',()=>{try{captureThumb();save();}catch{}});
// ---------- arranque (llamado por el módulo de three.js en index.html) ----------
function initApp(){
 try{initScene();}
 catch(err){console.error(err);bootFail('No se pudo iniciar el visor 3D (¿WebGL deshabilitado?). Tus datos guardados están intactos.');return;}
 themeScene();rebuild();renderLib();renderGal();renderAppLogo();renderSet();size();
}
