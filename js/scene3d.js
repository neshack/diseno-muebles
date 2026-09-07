// Concepto Mueble — escena 3D: mallas, selección, gizmo, vistas, capturas y PDF
// Este archivo usa THREE (cargado por el módulo de arranque en index.html);
// nada se ejecuta hasta que initScene() es llamado tras cargar la librería.
'use strict';
let el=null,renderer=null,scene=null,cam=null,orbit=null,grid=null,ground=null,tCtrl=null,ray=null,ptr=null;
let meshes=[],sel=[],dragBase=null,scaleBase=null,sceneReady=false;
let down=null,mq=null,mqEl=null,gizmoMoved=false,gizmoSnap=null;
// ---------- selección múltiple ----------
const primary=()=>sel[sel.length-1]||null;
const modKey=e=>e.shiftKey||e.ctrlKey||e.metaKey;
function paintSel(m,on){
 m.material.emissive.setHex(on?0xd99a4e:0x000000);m.material.emissiveIntensity=.45;
 m.children[0].material.color.setHex(on?0xd99a4e:0x000000);
}
function syncSelUI(){[...$('partsList').children].forEach((d,i)=>{if(meshes[i])d.classList.toggle('sel',sel.includes(meshes[i]));});}
function setSel(arr){
 sel.forEach(m=>{if(meshes.includes(m))paintSel(m,false);});
 sel=[...new Set(arr)].filter(m=>meshes.includes(m));
 sel.forEach(m=>paintSel(m,true));
 const p=primary();
 if(p){tCtrl.attach(p);fillPanel(p.userData.item);}
 else{tCtrl.detach();fillPanel(null);}
 syncSelUI();updateDims();
}
function toggleSel(m){setSel(sel.includes(m)?sel.filter(x=>x!==m):[...sel,m]);}
function pick(e){const r=renderer.domElement.getBoundingClientRect();
 ptr.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
 ray.setFromCamera(ptr,cam);return ray.intersectObjects(meshes,false)[0]||null;}
// ---------- geometría paramétrica ----------
function makeGeometry(it){
 const s=v=>v/1000;
 switch(it.shape){
  case 'cyl':case 'cone':case 'pot':{
   let g;
   if(it.shape==='cyl')g=new THREE.CylinderGeometry(s(it.w)/2,s(it.w)/2,s(it.h),28);
   else if(it.shape==='cone')g=new THREE.ConeGeometry(s(it.w)/2,s(it.h),28);
   else g=new THREE.CylinderGeometry(s(it.w)/2,s(it.d)/2,s(it.h),28);
   if(it.flip)g.rotateX(Math.PI);
   if(it.axis==='x')g.rotateZ(Math.PI/2);else if(it.axis==='z')g.rotateX(Math.PI/2);
   return g;}
  case 'cap':{
   const r=Math.min(s(it.w),s(it.d))/2,len=Math.max(0,s(it.h)-2*r);
   const g=new THREE.CapsuleGeometry(r,len,6,20);
   if(it.axis==='x')g.rotateZ(Math.PI/2);else if(it.axis==='z')g.rotateX(Math.PI/2);
   return g;}
  case 'sph':return new THREE.SphereGeometry(s(it.w)/2,28,18);
  case 'torus':{
   const r=s(it.h)/2,R=Math.max(s(it.w)/2-r,r*.4);
   const g=new THREE.TorusGeometry(R,r,14,40);
   if(it.axis==='y')g.rotateX(Math.PI/2);
   return g;}
  case 'vase':{
   const r=s(it.w)/2,h=s(it.h);
   const prof=[[0,0],[.42,0],[.5,.06],[.3,.32],[.38,.6],[.2,.85],[.22,1]].map(p=>new THREE.Vector2(p[0]*r,p[1]*h));
   return new THREE.LatheGeometry(prof,32);}
  default:return new THREE.BoxGeometry(s(it.w),s(it.h),s(it.d));
 }
}
const deg=d=>THREE.MathUtils.degToRad(d||0);
// ---------- muescas y perforaciones: restan sólido con CSG ----------
// cada corte (mm, relativo al centro de la pieza) se resta del volumen; sin el
// motor CSG (sin internet) la pieza simplemente se muestra maciza
// el booleano deja vértices apoyados a mitad de la arista del triángulo vecino
// (T-junctions): EdgesGeometry los pinta como líneas fantasma sobre la cara y el
// sólido queda con grietas de malla. Esto divide esos triángulos hasta que toda
// arista interior quede compartida por dos triángulos.
function fixTJunctions(geo){
 const pos=geo.attributes.position,nor=geo.attributes.normal,n=pos.count,P=1e4;
 const keys=new Map();
 const getKey=i=>{
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const k=Math.round(x*P)+','+Math.round(y*P)+','+Math.round(z*P);
  // una misma posición puede tener varias normales (cara + pared de un agujero):
  // se guardan todas y al construir cada triángulo se elige la que le corresponda
  const nx=nor.getX(i),ny=nor.getY(i),nz=nor.getZ(i);
  if(!keys.has(k))keys.set(k,{p:[x,y,z],ns:[[nx,ny,nz]]});
  else{const e=keys.get(k);if(!e.ns.some(q=>q[0]===nx&&q[1]===ny&&q[2]===nz))e.ns.push([nx,ny,nz]);}
  return k;};
 let tris=[];
 for(let t=0;t<n;t+=3)tris.push([getKey(t),getKey(t+1),getKey(t+2)]);
 const kv=k=>keys.get(k).p;
 const onSeg=(p,a,b)=>{ // p cae sobre el segmento ab (tolerancia 0.1 mm), sin ser extremo
  const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],apx=p[0]-a[0],apy=p[1]-a[1],apz=p[2]-a[2];
  const len2=abx*abx+aby*aby+abz*abz;if(len2<1e-12)return false;
  const t=(apx*abx+apy*aby+apz*abz)/len2;if(t<1e-6||t>1-1e-6)return false;
  const cx=apy*abz-apz*aby,cy=apz*abx-apx*abz,cz=apx*aby-apy*abx;
  return(cx*cx+cy*cy+cz*cz)/len2<1e-8;};
 for(let iter=0;iter<6;iter++){
  const use={};
  tris.forEach((t,ti)=>{for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if(a===b)continue;
   const h=a<b?a+'|'+b:b+'|'+a;(use[h]=use[h]||[]).push(ti);}});
  const splits=new Map();
  tris.forEach((t,ti)=>{
   for(let j=0;j<3;j++){
    const a=t[j],b=t[(j+1)%3];if(a===b||splits.has(ti))continue;
    const h=a<b?a+'|'+b:b+'|'+a;
    if(!use[h]||use[h].length!==1)continue; // solo aristas de frontera
    const A=kv(a),B=kv(b),mid=[];
    for(const[k,v]of keys){if(k===a||k===b)continue;if(onSeg(v.p,A,B))mid.push(k);}
    if(mid.length){mid.sort((k1,k2)=>{
     const P1=kv(k1),P2=kv(k2);
     return (P1[0]-A[0])**2+(P1[1]-A[1])**2+(P1[2]-A[2])**2-((P2[0]-A[0])**2+(P2[1]-A[1])**2+(P2[2]-A[2])**2);});
     splits.set(ti,{j,mid});}
   }});
  if(!splits.size)break;
  const out=[];
  tris.forEach((t,ti)=>{
   const s=splits.get(ti);
   if(!s){out.push(t);return;}
   const a=t[s.j],b=t[(s.j+1)%3],c=t[(s.j+2)%3];
   const chain=[a,...s.mid,b];
   for(let i=0;i<chain.length-1;i++)out.push([chain[i],chain[i+1],c]);
  });
  tris=out;
 }
 const posArr=[],norArr=[];
 const A=new THREE.Vector3(),Bv=new THREE.Vector3(),Cv=new THREE.Vector3(),N=new THREE.Vector3(),T2=new THREE.Vector3();
 tris.forEach(t=>{
  if(t[0]===t[1]||t[1]===t[2]||t[2]===t[0])return;
  A.fromArray(kv(t[0]));Bv.fromArray(kv(t[1]));Cv.fromArray(kv(t[2]));
  N.copy(Bv).sub(A).cross(T2.copy(Cv).sub(A));
  if(N.lengthSq()<1e-14)return; // degenerado o pelín de área nula: fuera
  N.normalize();
  t.forEach(k=>{
   const e=keys.get(k);let best=e.ns[0],bd=-2;
   for(const q of e.ns){const d=q[0]*N.x+q[1]*N.y+q[2]*N.z;if(d>bd){bd=d;best=q;}}
   // el split puede insertar en esta cara un vértice que solo existía en otra
   // (p. ej. la pared de un agujero): su normal no pega — usa la del triángulo
   const q=bd<0.5?[N.x,N.y,N.z]:best;
   posArr.push(...e.p);norArr.push(...q);});});
 const g2=new THREE.BufferGeometry();
 g2.setAttribute('position',new THREE.Float32BufferAttribute(posArr,3));
 g2.setAttribute('normal',new THREE.Float32BufferAttribute(norArr,3));
 geo.dispose();
 return g2;
}
function applyItemCuts(base,it){
 if(!it.cuts||!it.cuts.length||!window.CSG)return base;
 base.computeBoundingBox();
 const ext=new THREE.Vector3();base.boundingBox.getSize(ext);
 const size=[ext.x,ext.y,ext.z],AX={x:0,y:1,z:2},PERP=[[1,2],[0,2],[0,1]];
 let g=base;
 for(const c of it.cuts){
  const ai=AX[c.ax]??2,pa=PERP[ai][0],pb=PERP[ai][1],over=.01;
  let depth=c.p>0?c.p/1000:0;
  if(depth&&depth>=size[ai]-.002)depth=0; // casi pasante: sus caras serían coplanares
  const len=depth||size[ai]+2*over,ctr=[0,0,0];
  ctr[ai]=depth?(c.side==='+'?1:-1)*(size[ai]/2+over-len/2):0;
  ctr[pa]=c.a/1000;ctr[pb]=c.b/1000;
  let bg;
  if(c.t==='hole'){
   bg=new THREE.CylinderGeometry(c.d/2000,c.d/2000,len,24);
   if(c.ax==='x')bg.rotateZ(Math.PI/2);else if(c.ax==='z')bg.rotateX(Math.PI/2);
  }else{
   const s3=[0,0,0];s3[ai]=len;s3[pa]=c.w/1000;s3[pb]=c.h/1000;
   // si una cara del corte queda a ras de la pieza, hazla sobresalir un pelín:
   // el booleano no tolera caras exactamente coplanares
   for(const ax of[pa,pb])if(Math.abs(ctr[ax])+s3[ax]/2>size[ax]/2-1e-4)s3[ax]=Math.max(s3[ax],2*(size[ax]/2+over-Math.abs(ctr[ax])));
   bg=new THREE.BoxGeometry(s3[0],s3[1],s3[2]);
  }
  bg.translate(ctr[0],ctr[1],ctr[2]);
  const A=new window.CSG.Brush(g),Bc=new window.CSG.Brush(bg);
  A.updateMatrixWorld();Bc.updateMatrixWorld();
  try{
   const res=window.CSG.ev.evaluate(A,Bc,window.CSG.SUBTRACTION);
   if(g!==base)g.dispose();
   bg.dispose();
   g=res.geometry;
  }catch(err){console.error('corte 3D:',err);bg.dispose();break;}
 }
 return g!==base?fixTJunctions(g):g;
}
function itemGeometry(it){return applyItemCuts(makeGeometry(it),it);}
function rebuildMeshGeometry(m,it){
 m.geometry.dispose();m.geometry=itemGeometry(it);
 if(m.children[0]){m.children[0].geometry.dispose();m.children[0].geometry=new THREE.EdgesGeometry(m.geometry,24);}
}
function addMesh(it){
 if(!it.matId)it.matId=defMat();
 const g=itemGeometry(it);
 // objetos de corte (brocas y muescas): fantasma translúcido hasta consumirse
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:it.color,roughness:.7,transparent:!!it.ghost,opacity:it.ghost?.4:1}));
 m.position.set(it.x/1000,it.y/1000,it.z/1000);
 m.rotation.set(deg(it.rx),deg(it.ry),deg(it.rz));
 m.castShadow=!it.ghost;m.userData.item=it;
 m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,24),new THREE.LineBasicMaterial({color:it.ghost?0xd99a4e:0x000000})));
 scene.add(m);meshes.push(m);return m;
}
function applyToMesh(it){
 const m=meshes.find(m=>m.userData.item===it);if(!m)return;
 rebuildMeshGeometry(m,it);
 m.position.set(it.x/1000,it.y/1000,it.z/1000);
 m.rotation.set(deg(it.rx),deg(it.ry),deg(it.rz));
 m.scale.set(1,1,1); // la escala del gizmo ya quedó "hornada" en las medidas
 m.material.color.set(it.color);
}
// mover = posición; rotar = guarda rotación; escalar = hornea el tamaño en las medidas
// escala: el gizmo escala sobre ejes locales (válido aunque la pieza esté girada,
// a diferencia de la caja envolvente mundial que se usaba antes); al soltar, la
// escala se hornea en las medidas w/h/d y la pieza se re-apoya en su base
function bakeScale(){
 const p=tCtrl.object,it=scaleBase.it;
 it.w=Math.max(1,Math.round(scaleBase.w*p.scale.x));
 it.h=Math.max(1,Math.round(scaleBase.h*p.scale.y));
 it.d=Math.max(1,Math.round(scaleBase.d*p.scale.z));
 p.scale.set(1,1,1);rebuildMeshGeometry(p,it);
 const box=new THREE.Box3().setFromObject(p);
 if(isFinite(box.min.y)&&isFinite(scaleBase.minY)){
  it.y=Math.max(0,Math.round(it.y+(scaleBase.minY-box.min.y)*1000));
  p.position.y=it.y/1000;}
 fillPanel(it);renderCuts();scheduleSave();
 scaleBase=null;
}
function syncFromMesh(){
 const m=tCtrl.object;if(!m)return;const it=m.userData.item;
 if(tCtrl.mode==='rotate'){
  it.rx=Math.round(THREE.MathUtils.radToDeg(m.rotation.x)*10)/10;
  it.ry=Math.round(THREE.MathUtils.radToDeg(m.rotation.y)*10)/10;
  it.rz=Math.round(THREE.MathUtils.radToDeg(m.rotation.z)*10)/10;
 }
 it.x=Math.round(m.position.x*1000);it.y=Math.round(m.position.y*1000);it.z=Math.round(m.position.z*1000);
 fillPanel(it);renderCuts();syncDimsTransform();
}
function disposeMesh(m){
 // sin scene.remove la malla quedaba en la escena como "fantasma": se seguía
 // viendo tras deshacer/cambiar de proyecto pero la app ya no la conocía
 scene.remove(m);
 m.geometry.dispose();m.material.dispose();
 m.children.forEach(c=>{c.geometry.dispose();c.material.dispose();});
}
function rebuild(){
 if(!sceneReady)return;
 [...meshes].forEach(disposeMesh);
 meshes=[];sel=[];tCtrl.detach();
 cur().items.forEach(addMesh);refreshAll();size();fitAll(new THREE.Vector3(1,0.62,1.15));
}
function themeScene(){
 if(!scene)return;
 const L=document.documentElement.dataset.theme==='light';
 scene.background.set(L?0xececea:0x0d0d10);
 scene.remove(grid);grid.geometry.dispose();grid.material.dispose();
 grid=new THREE.GridHelper(10,20,L?0xb9b9bd:0x34343b,L?0xd8d8dc:0x1f1f26);
 scene.add(grid);
}
// miniatura recortada al centro (como object-fit: cover), sin deformar
function captureThumb(){
 if(!sceneReady||!meshes.length)return;
 renderer.render(scene,cam);
 const src=renderer.domElement,c=document.createElement('canvas');
 c.width=320;c.height=200;
 const sr=src.width/src.height,dr=c.width/c.height;
 let sw,sh,sx,sy;
 if(sr>dr){sh=src.height;sw=sh*dr;sx=(src.width-sw)/2;sy=0;}
 else{sw=src.width;sh=sw/dr;sx=0;sy=(src.height-sh)/2;}
 c.getContext('2d').drawImage(src,sx,sy,sw,sh,0,0,c.width,c.height);
 cur().thumb=c.toDataURL('image/jpeg',.6);
}
// ---------- encuadre + zoom ----------
function frameBox(){
 const box=new THREE.Box3();
 meshes.forEach(m=>box.expandByObject(m));
 if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(0,0.8,0),new THREE.Vector3(1.6,1.6,1.6));
 return box;
}
function fitDist(box){
 const s=new THREE.Vector3();(box||frameBox()).getSize(s);
 const r=Math.max(s.length()/2,0.3);
 return r/Math.sin(THREE.MathUtils.degToRad(cam.fov/2))*1.12;
}
function fitAll(dir){
 const box=frameBox(),c=new THREE.Vector3();box.getCenter(c);
 const d=(dir||cam.position.clone().sub(orbit.target)).normalize();
 cam.position.copy(c).addScaledVector(d,fitDist(box));
 orbit.target.copy(c);orbit.update();updateZoom();
}
function zoomBy(f){
 const d=cam.position.clone().sub(orbit.target),n=THREE.MathUtils.clamp(d.length()*f,0.25,80);
 cam.position.copy(orbit.target).addScaledVector(d.normalize(),n);orbit.update();updateZoom();
}
function updateZoom(){
 const pct=Math.round(fitDist()/cam.position.distanceTo(orbit.target)*100);
 $('zPct').textContent=Math.min(999,Math.max(5,pct))+'%';
}
// ---------- cotas visuales (medidas dibujadas sobre el modelo) ----------
let dimGroup=null;
function disposeDims(){
 if(!dimGroup)return;
 dimGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();
  if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});
 scene.remove(dimGroup);dimGroup=null;
}
function dimLabelSprite(text){
 const c=document.createElement('canvas'),x=c.getContext('2d');
 c.height=64;
 x.font='600 40px system-ui';
 c.width=Math.ceil(x.measureText(text).width)+30;
 x.font='600 40px system-ui';
 x.fillStyle='rgba(15,15,18,.88)';
 if(x.roundRect){x.beginPath();x.roundRect(0,0,c.width,c.height,14);x.fill();}
 else x.fillRect(0,0,c.width,c.height);
 x.fillStyle='#fff';x.textBaseline='middle';x.fillText(text,15,c.height/2+2);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));
 s.userData.aspect=c.width/c.height;s.renderOrder=1001;
 return s;
}
// escala de las etiquetas de cota para cualquier cámara: altura constante en pantalla
function scaleDimsFor(camera,viewH){
 const v=new THREE.Vector3(),px=26;
 dimGroup.children.forEach(o=>{
  if(!o.isSprite)return;
  o.getWorldPosition(v);
  const d=camera.position.distanceTo(v);
  const h=px*(2*d*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/viewH);
  o.scale.set(h*(o.userData.aspect||1),h,1);
 });
}
// las etiquetas se mantienen legibles: altura constante en pantalla sin importar el zoom
function updateDimLabelScale(){
 if(!dimGroup)return;
 scaleDimsFor(cam,el.clientHeight||1);
}
// durante un arrastre solo se sigue la posición/rotación de la pieza: no se
// reconstruye el grupo (evita recrear líneas y texturas en cada frame)
function syncDimsTransform(){
 if(!dimGroup||!tCtrl.object)return;
 if(dimGroup.userData.item!==tCtrl.object.userData.item)return;
 dimGroup.position.copy(tCtrl.object.position);
 dimGroup.rotation.copy(tCtrl.object.rotation);
}
// dibuja las cotas de la pieza seleccionada (en su orientación) o del conjunto
function updateDims(){
 if(!sceneReady)return;
 disposeDims();
 if(!store.showDims)return;
 const m=tCtrl.object;let bb,transform=null;
 if(m){m.geometry.computeBoundingBox();bb=m.geometry.boundingBox;transform=m;}
 else if(meshes.length){bb=frameBox();}
 else return;
 const x0=bb.min.x,y0=bb.min.y,z0=bb.min.z,x1=bb.max.x,y1=bb.max.y,z1=bb.max.z;
 const w=x1-x0,h=y1-y0,d=z1-z0;
 const off=Math.min(.4,Math.max(.06,Math.max(w,h,d)*.12));
 dimGroup=new THREE.Group();
 if(transform){dimGroup.position.copy(transform.position);dimGroup.rotation.copy(transform.rotation);}
 const lm=new THREE.LineBasicMaterial({color:0xd99a4e,depthTest:false,transparent:true});
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const line=(a,b)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),lm);l.renderOrder=1000;dimGroup.add(l);};
 // ancho: bajo el borde frontal
 line(V(x0,y0,z1),V(x0,y0-off,z1+off));line(V(x1,y0,z1),V(x1,y0-off,z1+off));
 line(V(x0,y0-off,z1+off),V(x1,y0-off,z1+off));
 // alto: junto al borde derecho
 line(V(x1,y0,z1),V(x1+off,y0,z1+off));line(V(x1,y1,z1),V(x1+off,y1,z1+off));
 line(V(x1+off,y0,z1+off),V(x1+off,y1,z1+off));
 // fondo: junto al borde inferior derecho
 line(V(x1,y0,z0),V(x1+off,y0-off,z0));line(V(x1,y0,z1),V(x1+off,y0-off,z1));
 line(V(x1+off,y0-off,z0),V(x1+off,y0-off,z1));
 const lbl=(t,x,y,z)=>{const s=dimLabelSprite(t);s.position.set(x,y,z);dimGroup.add(s);};
 lbl('Ancho '+fmt(w*1000),(x0+x1)/2,y0-off,z1+off);
 lbl('Alto '+fmt(h*1000),x1+off,(y0+y1)/2,z1+off);
 lbl('Fondo '+fmt(d*1000),x1+off,y0-off,(z0+z1)/2);
 dimGroup.userData.item=m?m.userData.item:null;
 scene.add(dimGroup);
 // escala inicial correcta sin esperar al primer frame del bucle
 updateDimLabelScale();
}
function setDimsBtn(on){
 const b=$('btnDims');b.classList.toggle('on',on);
 $('btnDimsLbl').textContent=on?'Ocultar':'Mostrar';
 if(on)b.setAttribute('aria-pressed','true');else b.removeAttribute('aria-pressed');
}
function setView(v){
 const dirs={front:new THREE.Vector3(0,0.06,1),side:new THREE.Vector3(1,0.06,0),top:new THREE.Vector3(0.02,1,0.02),persp:new THREE.Vector3(1,0.62,1.15)};
 fitAll(dirs[v]||dirs.persp);
 document.querySelectorAll('#dViews button').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);if(on)b.setAttribute('aria-pressed','true');else b.removeAttribute('aria-pressed');});
}
function size(){
 if(!renderer)return;
 const w=el.clientWidth,h=el.clientHeight||innerHeight*.55;if(!w)return;
 renderer.setSize(w,Math.max(h,320));cam.aspect=w/Math.max(h,320);cam.updateProjectionMatrix();renderer.render(scene,cam);
}
// ---------- capturas ----------
// La hoja de exportación se rinde en un renderer fuera de pantalla con tamaño
// fijo: capturar el visor en vivo heredaba el aspecto de la ventana y, al
// encajarlo en la hoja, la imagen salía estirada. Fuera de pantalla también se
// apartan gizmo, rejilla, selección y cortes fantasma sin tocar lo que el
// usuario ve, y la cámara del editor queda exactamente como estaba.
const loadImage=src=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.src=src;});
// minimal=true: sin cabecera (para el PDF, que pone sus propios títulos)
async function sheet4(minimal){
 const W=2000,H=1500,GUT=26,CAP=44,ASPECT=1.6;
 const headH=minimal?40:186,footH=minimal?40:64;
 // celdas 16:10 limitadas por alto (con cabecera/pies) y por el ancho de hoja
 const imgH=Math.min(Math.floor((H-headH-footH-2*CAP-3*GUT)/2),Math.floor((W-160-GUT)/2/ASPECT));
 const imgW=Math.floor(imgH*ASPECT);
 const gridW=imgW*2+GUT,x0=Math.round((W-gridW)/2);
 const y0=minimal?headH+Math.round((H-headH-footH-(2*(imgH+CAP)+GUT))/2):headH+GUT;
 // encuadre común a las 4 vistas (los cortes fantasma no cuentan para el marco)
 const box=new THREE.Box3();
 meshes.forEach(m=>{if(m.visible)box.expandByObject(m);});
 if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(0,.8,0),new THREE.Vector3(1.6,1.6,1.6));
 const ctr=new THREE.Vector3();box.getCenter(ctr);
 // encuadre ceñido por vista: se proyectan las esquinas y se calcula la
 // distancia que las deja con un margen parejo (la holgura de la diagonal
 // de la caja dejaba el mueble demasiado pequeño dentro de la celda)
 const corners=[];
 for(const[cx,cy,cz]of[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]])
  corners.push(new THREE.Vector3(cx?box.max.x:box.min.x,cy?box.max.y:box.min.y,cz?box.max.z:box.min.z));
 const DIRS=[['PERSPECTIVA',1,.62,1.15],['FRENTE',0,.06,1],['LADO',1,.06,0],['PLANTA',.02,1,.02]];
 const attached=tCtrl.object,ghosts=meshes.filter(m=>m.userData.item&&m.userData.item.ghost),selSave=sel.slice();
 const r2=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 r2.setPixelRatio(2);r2.setSize(imgW,imgH);r2.shadowMap.enabled=true;
 const c2=new THREE.PerspectiveCamera(45,imgW/imgH,.01,100);
 const corner=new THREE.Vector3();
 const fitDist=d=>{
  // distancia mínima exacta: cada esquina vista desde la cámara exige
  // profundidad suficiente para entrar en el frustum con margen parejo
  // (extrapolar linealmente la proyección falla en vistas planta de piezas altas)
  c2.position.copy(ctr).addScaledVector(d,10);c2.lookAt(ctr);c2.updateMatrixWorld();
  const f=1/Math.tan(THREE.MathUtils.degToRad(c2.fov/2)),M=.84;
  let D=.5;
  corners.forEach(p=>{
   corner.copy(p).applyMatrix4(c2.matrixWorldInverse); // espacio cámara: -z al frente
   const base=10+corner.z; // distancia del punto al plano de la cámara
   D=Math.max(D,base+Math.abs(corner.x)*f/(c2.aspect*M),base+Math.abs(corner.y)*f/M);
  });
  return D;
 };
 const bgSave=scene.background.clone();
 scene.background.set(0xf1eee8);grid.visible=false;ghosts.forEach(m=>m.visible=false);
 selSave.forEach(m=>paintSel(m,false));
 if(attached)tCtrl.detach();
 if(dimGroup&&!store.showDims)dimGroup.visible=false;
 const shots=[];
 try{
  for(const[,dx,dy,dz]of DIRS){
   const d=new THREE.Vector3(dx,dy,dz).normalize();
   const dist=fitDist(d); // fitDist recoloca c2: recolocar de nuevo con la distancia final
   c2.position.copy(ctr).addScaledVector(d,dist);c2.lookAt(ctr);
   if(dimGroup&&dimGroup.visible)scaleDimsFor(c2,imgH);
   r2.render(scene,c2);
   shots.push(r2.domElement.toDataURL('image/png'));
  }
 }finally{ // la escena del editor queda como estaba, incluso si algo falla
  scene.background.copy(bgSave);grid.visible=true;ghosts.forEach(m=>m.visible=true);
  selSave.forEach(m=>paintSel(m,true));
  if(attached)tCtrl.attach(attached);
  if(dimGroup&&!store.showDims)dimGroup.visible=true;
  r2.dispose();r2.forceContextLoss();
 }
 // composición de la hoja
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const ink='#1c1a16',mut='#8f887a',hair='#ddd6c8',amber='#c08a3e';
 x.fillStyle='#faf8f3';x.fillRect(0,0,W,H);
 const S=store.settings||{};
 if(!minimal){
  x.fillStyle=amber;x.font='600 15px system-ui,sans-serif';x.letterSpacing='4px';
  x.fillText('PRESENTACIÓN DEL PROYECTO',80,72);
  x.letterSpacing='0px';
  x.fillStyle=ink;x.font='700 46px system-ui,sans-serif';
  x.fillText(cur().name,80,124);
  const n=cur().items.length;
  x.font='400 20px system-ui,sans-serif';x.fillStyle=mut;
  x.fillText(`${cur().client?'Cliente: '+cur().client+'  ·  ':''}${new Date().toLocaleDateString()}  ·  ${n} pieza${n===1?'':'s'}`,80,160);
  let logoW=0;
  if(S.logo){try{const im=await loadImage(S.logo);logoW=Math.min(150,54*im.width/im.height);x.drawImage(im,W-80-logoW,62,logoW,54);}catch{}}
  if(S.business){x.font='600 20px system-ui,sans-serif';x.fillStyle=ink;x.textAlign='right';
   x.fillText(S.business,W-80-logoW-(logoW?18:0),96);x.textAlign='left';}
  x.strokeStyle=hair;x.lineWidth=1;x.beginPath();x.moveTo(80,186);x.lineTo(W-80,186);x.stroke();
  x.strokeStyle=amber;x.lineWidth=3;x.beginPath();x.moveTo(80,186);x.lineTo(196,186);x.stroke();
 }
 const ims=await Promise.all(shots.map(loadImage));
 ims.forEach((im,i)=>{
  const px=x0+(i%2)*(imgW+GUT),py=y0+Math.floor(i/2)*(imgH+CAP+GUT);
  x.save();
  if(x.roundRect){x.beginPath();x.roundRect(px,py,imgW,imgH,12);x.clip();}
  x.drawImage(im,px,py,imgW,imgH);
  x.restore();
  x.strokeStyle=hair;x.lineWidth=1;x.beginPath();
  if(x.roundRect)x.roundRect(px+.5,py+.5,imgW-1,imgH-1,12);else x.rect(px+.5,py+.5,imgW-1,imgH-1);
  x.stroke();
  x.fillStyle=mut;x.font='600 16px system-ui,sans-serif';x.letterSpacing='3px';x.textAlign='center';
  x.fillText('0'+(i+1)+' — '+DIRS[i][0],px+imgW/2,py+imgH+30);
  x.textAlign='left';x.letterSpacing='0px';
 });
 const ry=minimal?H-40:H-52;
 x.strokeStyle=hair;x.lineWidth=1;x.beginPath();x.moveTo(80,ry);x.lineTo(W-80,ry);x.stroke();
 x.fillStyle=amber;x.fillRect(80,ry+16,8,8);
 x.fillStyle=mut;x.font='400 16px system-ui,sans-serif';
 x.fillText('Concepto Mueble'+(S.business?' — '+S.business:''),96,ry+26);
 x.textAlign='right';x.fillText(new Date().toLocaleDateString(),W-80,ry+26);x.textAlign='left';
 return c;
}
async function pngBlob(){
 const c=await sheet4(false);
 const b=await new Promise(res=>c.toBlob(res,'image/png'));
 return new File([b],safeName(cur().name)+'-4-vistas.png',{type:'image/png'});
}
// ---------- exportación PDF/imagen ----------
$('btnPNG').onclick=async()=>{
 if(!sceneReady)return alert('El visor 3D aún se está cargando');
 if(!meshes.length)return alert('Agrega al menos una pieza antes de exportar');
 try{
  const f=await pngBlob();
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:cur().name});}catch{}}
  else{const a=document.createElement('a');a.download=f.name;a.href=URL.createObjectURL(f);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
 }catch(err){console.error(err);alert('No se pudo generar la imagen. Intenta de nuevo.');}
};
$('btnPDF').onclick=async()=>{
 const doc=jsPDFDoc({orientation:'landscape',unit:'mm',format:'a4'});if(!doc)return;
 if(!sceneReady)return alert('El visor 3D aún se está cargando');
 if(!meshes.length)return alert('Agrega al menos una pieza antes de exportar');
 try{
  const img=(await sheet4(true)).toDataURL('image/jpeg',.92);
  doc.setFontSize(16);doc.text('Concepto Mueble — '+cur().name,14,14);
  doc.setFontSize(10);doc.text(`Cliente: ${cur().client||'—'} · ${new Date().toLocaleDateString()} · ${cur().items.length} piezas`,14,20);
  doc.addImage(img,'JPEG',14,24,196,147); // la hoja es 2000×1500 = 4:3, sin deformar
  doc.setFontSize(11);doc.text('Despiece ('+store.unit+'):',14,178);
  doc.setFontSize(9);let y=184;
  cur().items.forEach(i=>{
   const ex=(i.measures||[]).map(m=>`${m.name}: ${fmt(m.val)}`).join(' · ');
   const cs=cutsSummary(i);
   const txt=`- ${String(i.name).slice(0,60)}: ${fmt(i.w)} x ${fmt(i.h)} x ${fmt(i.d)}${ex?' · '+ex:''}${cs?' · '+cs:''} · ${mat(i.matId).name}`;
   doc.splitTextToSize(txt,182).forEach(seg=>{if(y>196){doc.addPage();y=15;}doc.text(seg,14,y);y+=5;});}); // A4 apaisado: 210 mm de alto
 }catch(err){console.error(err);alert('No se pudo generar el PDF. Intenta de nuevo.');return;}
 doc.save(safeName(cur().name)+'.pdf');
};
// ---------- herramienta de selección por rectángulo ----------
let marqueeSel=false; // la alterna design.js desde el menú Selección
function marqueeOn(){return marqueeSel;}
function moveMq(e){const r=el.getBoundingClientRect();
 mqEl.style.left=Math.min(mq.x0,e.clientX)-r.left+'px';mqEl.style.top=Math.min(mq.y0,e.clientY)-r.top+'px';
 mqEl.style.width=Math.abs(e.clientX-mq.x0)+'px';mqEl.style.height=Math.abs(e.clientY-mq.y0)+'px';}
// ---------- inicialización (requiere THREE ya cargado) ----------
function initScene(){
 el=$('view');
 renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;el.prepend(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0d0d10);
 cam=new THREE.PerspectiveCamera(45,1,0.01,100);cam.position.set(2.2,1.8,2.6);
 orbit=new OrbitControls(cam,renderer.domElement);orbit.target.set(0,0.8,0);
 orbit.minDistance=0.25;orbit.maxDistance=80;
 scene.add(new THREE.HemisphereLight(0xffffff,0x555550,1.2));
 const sun=new THREE.DirectionalLight(0xfff2e0,1.8);sun.position.set(3,5,2);sun.castShadow=true;scene.add(sun);
 grid=new THREE.GridHelper(10,20,0x34343b,0x1f1f26);scene.add(grid);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({opacity:.35}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 tCtrl=new TransformControls(cam,renderer.domElement);tCtrl.setMode('translate');scene.add(tCtrl);
 ray=new THREE.Raycaster();ptr=new THREE.Vector2();
 // gizmo: al empezar a arrastrar se toma instantánea para deshacer; en modo mover, arrastra toda la selección
 tCtrl.addEventListener('dragging-changed',e=>{
  orbit.enabled=!e.value;
  if(e.value){gizmoMoved=false;gizmoSnap=snapshot();
   const p=primary();
   scaleBase=(p&&tCtrl.mode==='scale')?{it:p.userData.item,w:p.userData.item.w,h:p.userData.item.h,d:p.userData.item.d,minY:new THREE.Box3().setFromObject(p).min.y}:null;
   dragBase=p?{pos:p.position.clone(),others:sel.filter(m=>m!==p).map(m=>({m,pos:m.position.clone()}))}:null;}
  else{if(gizmoMoved&&gizmoSnap){if(scaleBase)bakeScale();commitSnap(gizmoSnap);}gizmoSnap=null;dragBase=null;updateDims();}
 });
 tCtrl.addEventListener('objectChange',()=>{
  gizmoMoved=true;
  const p=tCtrl.object;if(!p)return;
  if(tCtrl.mode==='scale'){ // en vivo solo las cifras; al soltar se hornean las medidas
   if(scaleBase){$('pW').value=fmt(Math.max(1,Math.round(scaleBase.w*p.scale.x)));
    $('pH').value=fmt(Math.max(1,Math.round(scaleBase.h*p.scale.y)));
    $('pD').value=fmt(Math.max(1,Math.round(scaleBase.d*p.scale.z)));}
   return;}
  if(dragBase){const d=p.position.clone().sub(dragBase.pos);
   dragBase.others.forEach(o=>{o.m.position.copy(o.pos).add(d);const it=o.m.userData.item;
    it.x=Math.round(o.m.position.x*1000);it.y=Math.round(o.m.position.y*1000);it.z=Math.round(o.m.position.z*1000);});}
  syncFromMesh();scheduleSave();
 });
 // selección en el lienzo: clic, Mayús/Ctrl+clic agrega, herramienta de selección arrastra un rectángulo
 mqEl=document.createElement('div');mqEl.id='marquee';el.appendChild(mqEl);
 renderer.domElement.addEventListener('pointerdown',e=>{
  if(tCtrl.dragging||e.button!==0)return;
  const hit=pick(e);
  if(marqueeOn()&&!hit&&!tCtrl.axis){
   mq={x0:e.clientX,y0:e.clientY};down=null;
   orbit.enabled=false;mqEl.style.display='block';moveMq(e);return;}
  down={x:e.clientX,y:e.clientY,gizmo:!!tCtrl.axis};
  // con el gizmo bajo el cursor no se cambia la selección: evita descolgar
  // el gizmo a mitad del arrastre cuando un aro se superpone a otra pieza
  if(!down.gizmo&&hit){if(modKey(e))toggleSel(hit.object);
   else if(sel.length!==1||sel[0]!==hit.object)setSel([hit.object]);}
 });
 addEventListener('pointermove',e=>{if(mq)moveMq(e);});
 addEventListener('pointerup',e=>{
  if(mq){
   const r=renderer.domElement.getBoundingClientRect();
   const x0=Math.min(mq.x0,e.clientX)-r.left,x1=Math.max(mq.x0,e.clientX)-r.left,
         y0=Math.min(mq.y0,e.clientY)-r.top,y1=Math.max(mq.y0,e.clientY)-r.top;
   mq=null;mqEl.style.display='none';orbit.enabled=true;
   if(x1-x0>4&&y1-y0>4){
    const v=new THREE.Vector3(),hits=[];
    meshes.forEach(m=>{const b=new THREE.Box3().setFromObject(m);
     for(const[cx,cy,cz]of[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]]){
      v.set(cx?b.max.x:b.min.x,cy?b.max.y:b.min.y,cz?b.max.z:b.min.z).project(cam);
      const sx=(v.x+1)/2*r.width,sy=(1-(v.y+1)/2)*r.height;
      if(sx>=x0&&sx<=x1&&sy>=y0&&sy<=y1){hits.push(m);break;}}});
    setSel(hits);
   }
   return;}
  if(down&&down.gizmo){down=null;return;}
  if(down&&e.target===renderer.domElement){
   const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;down=null;
   if(!moved&&!modKey(e)&&!pick(e))setSel([]);
  }else down=null;
 });
 renderer.domElement.addEventListener('dblclick',()=>fitAll());
 orbit.addEventListener('change',()=>{if($('s-design').classList.contains('on'))requestAnimationFrame(updateZoom);});
 sceneReady=true;
 setDimsBtn(store.showDims);
 // el render nunca queda atrapado por un error de cotas: el canvas no se congela
 (function loop(){requestAnimationFrame(loop);if(!$('s-design').classList.contains('on'))return;
  try{orbit.update();updateDimLabelScale();syncDimsTransform();}catch(err){console.error('cotas:',err);}
  renderer.render(scene,cam);})();
}
// botones de vista/zoom (funcionan una vez la escena existe)
$('zIn').onclick=()=>zoomBy(0.75);
$('zOut').onclick=()=>zoomBy(1.33);
$('zPct').onclick=()=>fitAll();
$('notch').onclick=e=>{e.stopPropagation();const d=$('drawer'),open=d.classList.toggle('open');$('notch').setAttribute('aria-expanded',open);$('notch').setAttribute('aria-label',open?'Ocultar herramientas':'Mostrar herramientas');};
$('view').addEventListener('pointerdown',e=>{if(!e.target.closest('#drawer,#notch')){$('drawer').classList.remove('open');$('notch').setAttribute('aria-expanded','false');}},true);
$('btnFull').onclick=()=>{const s=$('s-design');
 if(document.fullscreenElement)document.exitFullscreen();
 else if(s.requestFullscreen)s.requestFullscreen();
 else alert('Pantalla completa no disponible en este navegador.');};
document.querySelectorAll('#dViews button').forEach(b=>b.onclick=()=>{setView(b.dataset.v);if(sceneReady)renderer.render(scene,cam);});
$('btnDims').onclick=()=>{store.showDims=!store.showDims;save();setDimsBtn(store.showDims);updateDims();};
