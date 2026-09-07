// Concepto Mueble — datos, persistencia y utilidades base (todo en mm internamente)
'use strict';
const LS='muebles3d.v3', SHEET={w:1220,h:2440};
const COLORS=['#c89b6d','#8b5a2b','#e8dcc8','#5b6570','#2f3a44','#7a2e2e'];
const PALETTE=['#f5f5f4','#e8dcc8','#c89b6d','#8b5a2b','#5b3a1e','#c0c4c8','#5b6570','#3a3a3d','#1c1c1e','#7a2e2e','#2e4a7a','#7fb069'];
const SEED_MAT=[
 {id:'m-mel-b',name:'Melamina blanca 18mm',unit:'hoja',price:850,color:'#e8dcc8'},
 {id:'m-mel-n',name:'Melamina nogal 18mm',unit:'hoja',price:980,color:'#8b5a2b'},
 {id:'m-tri',name:'Triplay pino 15mm',unit:'hoja',price:620,color:'#c89b6d'},
 {id:'m-bis',name:'Bisagra bidimensional',unit:'pza',price:45},
 {id:'m-cor',name:'Corredera (par)',unit:'pza',price:120},
 {id:'m-jal',name:'Jaladera / tirador',unit:'pza',price:65,color:'#c0c4c8'},
 {id:'m-led',name:'Tira / spot LED',unit:'pza',price:180,color:'#f5f0dc'},
 {id:'m-mad',name:'Madera torneada (pza)',unit:'pza',price:180,color:'#c89b6d'},
 {id:'m-met',name:'Metal negro mate (pza)',unit:'pza',price:75,color:'#3a3a3d'},
 {id:'m-dec',name:'Cerámica decorativa (pza)',unit:'pza',price:140,color:'#e8dcc8'}];
const DEFAULT_SETTINGS={business:'Mi taller',rate:150,hours:8,margin:15,validity:15,kerf:3,logo:null};

const uid=()=>crypto.randomUUID?crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=n=>'$'+Math.round(n||0).toLocaleString('es-MX');
const safeName=s=>String(s||'archivo').replace(/[\\/:*?"<>|]+/g,'-').trim().slice(0,80)||'archivo';
// pieza base; shape: box|cyl|cone|pot|cap|sph|torus|vase; rx/ry/rz en grados
// measures: medidas extra que define el usuario (nombre + valor en mm); no afectan la geometría
const B=(n,c)=>({name:n,w:100,h:100,d:100,x:0,y:0,z:0,rx:0,ry:0,rz:0,color:c||COLORS[0],matId:'',noCut:false,shape:'box',measures:[]});
const isShaped=it=>!!it&&typeof it.shape==='string'&&it.shape!=='box'&&it.shape!=='';

function normItem(it){
 if(!it||typeof it!=='object')return Object.assign(B('Pieza'),{y:50});
 const pos=v=>{const n=Math.round(+v);return isFinite(n)?n:0;};
 const dim=v=>{const n=Math.round(+v);return isFinite(n)&&n>0?n:100;};
 return{name:String(it.name??'Pieza').slice(0,80),w:dim(it.w),h:dim(it.h),d:dim(it.d),
  x:pos(it.x),y:pos(it.y),z:pos(it.z),
  rx:Math.round((+it.rx||0)*10)/10,ry:Math.round((+it.ry||0)*10)/10,rz:Math.round((+it.rz||0)*10)/10,
  color:/^#[0-9a-fA-F]{6}$/.test(it.color||'')?it.color:COLORS[0],
  matId:typeof it.matId==='string'?it.matId.slice(0,48):'',
  noCut:!!it.noCut,ghost:!!it.ghost,
  shape:typeof it.shape==='string'&&/^[a-z]{2,8}$/.test(it.shape)?it.shape:'box',
  axis:it.axis==='x'||it.axis==='z'?it.axis:undefined,flip:!!it.flip,
  cuts:(Array.isArray(it.cuts)?it.cuts:[]).slice(0,24).map(c=>{
   if(!c||typeof c!=='object')return null;
   const off=v=>{const n=Math.round(+v||0);return isFinite(n)?Math.max(-5000,Math.min(5000,n)):0;};
   const dim=v=>{const n=Math.round(+v||0);return isFinite(n)&&n>0?Math.min(5000,n):1;};
   return{t:c.t==='notch'?'notch':'hole',ax:['x','y','z'].includes(c.ax)?c.ax:'z',
    a:off(c.a),b:off(c.b),d:dim(c.d),w:dim(c.w),h:dim(c.h),
    p:isFinite(+c.p)?Math.max(0,Math.min(5000,Math.round(+c.p))):0,side:c.side==='+'?'+':'-'};}).filter(Boolean),
  measures:(Array.isArray(it.measures)?it.measures:[]).slice(0,12).map(m=>{
   if(!m||typeof m!=='object')return null;
   const v=Math.round((+m.val||0)*100)/100;
   return{name:String(m.name??'').trim().slice(0,40)||'Medida',val:isFinite(v)?v:0};}).filter(Boolean)};
}
// para importar: además de normalizar, descarta entradas claramente inválidas
function sanitizeItem(it){
 if(!it||typeof it!=='object')return null;
 const ok=v=>isFinite(+v)&&+v>0;
 if(!(ok(it.w)&&ok(it.h)&&ok(it.d)))return null;
 return normItem(it);
}
function normExtras(list){
 return (Array.isArray(list)?list:[]).map(x=>x&&typeof x==='object'?{
  concepto:String(x.concepto??'Extra').slice(0,80),
  cant:Math.max(0,Math.round(+x.cant)||1),
  precio:Math.max(0,+x.precio||0)}:null).filter(x=>x&&x.concepto);
}
function normProject(p){
 p=p&&typeof p==='object'?p:{};
 return{id:String(p.id||uid()),name:String(p.name??'Proyecto').slice(0,80),client:String(p.client??'').slice(0,80),
  items:Array.isArray(p.items)?p.items.map(normItem):[],
  extras:normExtras(p.extras),
  laborHours:Math.max(0,+p.laborHours||0),laborRate:Math.max(0,+p.laborRate||0),margin:Math.max(0,+p.margin||0),
  thumb:typeof p.thumb==='string'&&p.thumb.startsWith('data:image')?p.thumb:null,
  quote:Array.isArray(p.quote)?p.quote:null,quoteManual:!!p.quoteManual,
  quoteNote:String(p.quoteNote??'').slice(0,140),showPrices:p.showPrices!==false};
}
function normTemplate(t){
 t=t&&typeof t==='object'?t:{};
 return{id:String(t.id||uid()),name:String(t.name??'Objeto').slice(0,80),
  items:(Array.isArray(t.items)?t.items:[]).map(normItem)};
}
function demoProject(){
 return normProject({id:'p1',name:'Librero demo',client:'Cliente demo',
  extras:[{concepto:'Herrajes lote',cant:1,precio:300}],laborHours:8,laborRate:150,margin:15,
  items:[
   {name:'Lateral izq',w:400,h:1800,d:30,x:-315,y:900,z:0,color:COLORS[0],matId:'m-mel-n'},
   {name:'Lateral der',w:400,h:1800,d:30,x:315,y:900,z:0,color:COLORS[0],matId:'m-mel-n'},
   {name:'Estante 1',w:600,h:30,d:380,x:0,y:400,z:0,color:COLORS[2],matId:'m-mel-b'},
   {name:'Estante 2',w:600,h:30,d:380,x:0,y:1000,z:0,color:COLORS[2],matId:'m-mel-b'},
   {name:'Base',w:660,h:50,d:400,x:0,y:25,z:0,color:COLORS[1],matId:'m-mel-n'}]});
}
function loadStore(){
 let s=null;
 try{s=JSON.parse(localStorage.getItem(LS)||'null');}catch{s=null;}
 if(s&&typeof s==='object'&&Array.isArray(s.projects)&&s.projects.length){
  s.unit=['mm','cm','in'].includes(s.unit)?s.unit:'mm';
  // el rediseño estrena tema claro: única migración para verlo desde el principio
  if(s.themeMigrated===undefined){s.theme='light';s.themeMigrated=true;}
  else s.theme=s.theme==='light'?'light':'dark';
  s.templates=Array.isArray(s.templates)?s.templates.map(normTemplate):[];
  s.materials=Array.isArray(s.materials)?s.materials.filter(m=>m&&typeof m==='object'&&m.id&&m.name).map(m=>({
   id:String(m.id).slice(0,48),name:String(m.name).slice(0,80),
   unit:m.unit==='hoja'||m.unit==='pza'?m.unit:'pza',
   price:Math.max(0,+m.price||0),
   color:/^#[0-9a-fA-F]{6}$/.test(m.color||'')?m.color:'',
   grain:!!m.grain})):[];
  if(!s.materials.length)s.materials=JSON.parse(JSON.stringify(SEED_MAT));
  s.projects=s.projects.map(normProject);
  s.settings=Object.assign({},DEFAULT_SETTINGS,s.settings&&typeof s.settings==='object'?s.settings:{});
  s.settings.kerf=Math.max(0,+s.settings.kerf||0);
  s.showDims=!!s.showDims;
  // matIds huérfanos: los herrajes sin material quedan sin cobrar; el resto cae al material de hoja por defecto
  const has=id=>s.materials.some(m=>m.id===id);
  const fb=s.materials.find(m=>m.unit==='hoja')||s.materials[0];
  s.projects.forEach(p=>p.items.forEach(i=>{
   if(i.matId&&!has(i.matId))i.matId=i.noCut?'':fb.id;}));
  s.templates.forEach(t=>t.items.forEach(i=>{
   if(i.matId&&!has(i.matId))i.matId=i.noCut?'':fb.id;}));
  return s;
 }
 // sin datos o datos corruptos: migrar desde v1/v2 (guardaban cm) o crear datos de ejemplo
 const raw=localStorage.getItem('muebles3d.v2')||localStorage.getItem('muebles3d.v1');
 let old=null;try{old=raw?JSON.parse(raw):null;}catch{old=null;}
 try{localStorage.removeItem('muebles3d.v1');localStorage.removeItem('muebles3d.v2');}catch{}
 const k=10; // v1 y v2 guardaban cm; la v3 guarda mm
 const conv=items=>(Array.isArray(items)?items:[]).map(i=>sanitizeItem({...i,w:+i.w*k,h:+i.h*k,d:+i.d*k,x:+i.x*k,y:+i.y*k,z:+i.z*k,matId:'m-mel-b'})).filter(Boolean);
 return{unit:'mm',theme:'light',themeMigrated:true,curId:null,showDims:false,
  templates:Array.isArray(old?.templates)?old.templates.map(normTemplate):[],
  materials:JSON.parse(JSON.stringify(SEED_MAT)),
  settings:{...DEFAULT_SETTINGS},
  projects:(Array.isArray(old?.projects)&&old.projects.length)
   ?old.projects.map(p=>normProject({...p,items:conv(p.items),extras:[],laborHours:8,laborRate:150,margin:15,thumb:null,quote:null}))
   :[demoProject()]};
}
let store=loadStore();
let curId=(store.curId&&store.projects.some(p=>p.id===store.curId))?store.curId:store.projects[0].id;
store.curId=curId;
document.documentElement.dataset.theme=store.theme||'dark';
let quotaWarned=false;
const save=()=>{store.curId=curId;try{localStorage.setItem(LS,JSON.stringify(store));}
 catch{if(!quotaWarned){quotaWarned=true;alert('No se pudo guardar: el almacenamiento del navegador está lleno. Exporta un archivo desde Proyectos y borra proyectos o el logotipo para liberar espacio.');}}};
const cur=()=>store.projects.find(p=>p.id===curId)||store.projects[0];
const mat=id=>store.materials.find(m=>m.id===id)||store.materials[0];
const defMat=()=>(store.materials.find(m=>m.unit==='hoja')||store.materials[0]).id;
// unidades
const F={mm:{f:v=>Math.round(v)+'',p:v=>+v||0},cm:{f:v=>+(v/10).toFixed(1)+'',p:v=>(+v||0)*10},in:{f:v=>+(v/25.4).toFixed(2)+'',p:v=>(+v||0)*25.4}};
const fmt=v=>F[store.unit].f(v);
const parse=v=>F[store.unit].p(parseFloat(String(v).trim().replace(',','.'))); // acepta coma decimal
