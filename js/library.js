// Concepto Mueble — librería de objetos y plantillas del usuario
'use strict';
const P=(n,w,h,d,c,mid)=>Object.assign(B(n,c),{w,h,d,x:0,y:Math.round(h/2),z:0,matId:mid||defMat()});
// herrajes: sin material válido quedan sin cobrar (noCut)
const H=(n,w,h,d,mid)=>Object.assign(B(n,'#c0c4c8'),{w,h,d,x:0,y:Math.round(h/2),z:0,matId:store.materials.some(m=>m.id===mid)?mid:'',noCut:true});
// piezas con forma 3D: cilindro, cono, maceta (cono truncado), esfera, toro, jarrón (torno), cápsula
const SP=(n,shape,w,h,d,c,mid,ex)=>Object.assign(B(n,c),{shape,w,h,d,x:0,y:Math.round(h/2),z:0,matId:mid||'',noCut:true,...(ex||{})});
const CY=(n,dia,h,c,mid,axis)=>SP(n,'cyl',dia,h,dia,c,mid,{axis:axis||'y'});
const LIB=[
 {cat:'Tablas',n:'Tabla 40×40',s:'e18',icon:'M4 12h16M6 12V6h12v6',make:()=>[P('Tabla 40×40',400,18,400,COLORS[2])]},
 {cat:'Tablas',n:'Tabla 60×40',s:'e18',icon:'M4 12h16M6 12V6h12v6',make:()=>[P('Tabla 60×40',600,18,400,COLORS[2])]},
 {cat:'Tablas',n:'Tabla 80×30',s:'e18',icon:'M4 12h16M6 12V6h12v6',make:()=>[P('Tabla 80×30',800,18,300,COLORS[2])]},
 {cat:'Tablas',n:'Cubierta 120',s:'120×60 e36',icon:'M4 12h16M6 12V6h12v6',make:()=>[P('Cubierta 120',1200,36,600,COLORS[0])]},
 {cat:'Patas',n:'Pata recta',s:'5×5 h70',icon:'M8 3v18M16 3v18M8 8h8',make:()=>[P('Pata recta',50,700,50,COLORS[1])]},
 {cat:'Patas',n:'Pata metal',s:'4×4 h72',icon:'M8 3v18M16 3v18M8 8h8',make:()=>[P('Pata metal',40,720,40,'#3a3a3d')]},
 {cat:'Patas',n:'Pata banca',s:'8×8 h45',icon:'M8 3v18M16 3v18M8 8h8',make:()=>[P('Pata banca',80,450,80,COLORS[1])]},
 {cat:'Herrajes',n:'Bisagra',s:'herraje',icon:'M7 3h10v18H7zM7 8h10M7 16h10',make:()=>[H('Bisagra',30,100,12,'m-bis')]},
 {cat:'Herrajes',n:'Corredera 40',s:'par',icon:'M4 9h16M4 15h16M6 9v6M18 9v6',make:()=>[H('Corredera 40cm',400,45,13,'m-cor')]},
 {cat:'Herrajes',n:'Jaladera 16',s:'cromo',icon:'M5 8h14M7 8v5a5 5 0 0010 0V8',make:()=>[H('Jaladera 160',160,28,25,'m-jal')]},
 {cat:'Cortes',n:'Broca Ø8',s:'perfora al superponer',icon:'M12 2v11M8 13h8l-1.5 5a3 3 0 01-5 0z',make:()=>{const c=CY('Broca Ø8',8,400,'#d99a4e');c.ghost=true;return[c];}},
 {cat:'Cortes',n:'Broca Ø15',s:'perfora al superponer',icon:'M12 2v11M8 13h8l-1.5 5a3 3 0 01-5 0z',make:()=>{const c=CY('Broca Ø15',15,400,'#d99a4e');c.ghost=true;return[c];}},
 {cat:'Cortes',n:'Broca Ø32',s:'perfora al superponer',icon:'M12 2v11M8 13h8l-1.5 5a3 3 0 01-5 0z',make:()=>{const c=CY('Broca Ø32',32,400,'#d99a4e');c.ghost=true;return[c];}},
 {cat:'Cortes',n:'Muesca 60×30',s:'tajo rectangular',icon:'M5 9h14v6H5zM9 9v6M15 9v6',make:()=>{const c=B('Muesca 60×30','#d99a4e');c.w=60;c.h=300;c.d=30;c.ghost=true;c.noCut=true;return[c];}},
 {cat:'Luces',n:'Tira LED 1m',s:'12V',icon:'M3 12h18M6 12l2-4 2 4 2-4 2 4 2-4 2 4',make:()=>[H('Tira LED 1m',1000,12,8,'m-led')]},
 {cat:'Luces',n:'Spot Ø70',s:'empotrado',icon:'M12 3v4M5 11h14M12 11a5 5 0 015 5v3H7v-3a5 5 0 015-5z',make:()=>[H('Spot LED',70,25,70,'m-led')]},
 {cat:'Muebles',n:'Repisa',s:'800 × 250',icon:'M4 12h16M6 12V6h12v6',make:()=>[P('Repisa',800,40,250,COLORS[0])]},
 {cat:'Muebles',n:'Mesa',s:'1200 · 4 patas',icon:'M3 8h18M5 8v11M19 8v11M5 14h14',make:()=>{const t=P('Cubierta',1200,40,600,COLORS[0]);t.y=720;const legs=[[-560,-260],[560,-260],[-560,260],[560,260]].map(([x,z],i)=>{const l=P('Pata '+(i+1),50,700,50,COLORS[1]);l.x=x;l.z=z;return l;});return[t,...legs];}},
 {cat:'Muebles',n:'Librero',s:'800 · 3 niveles',icon:'M5 3h14v18H5zM5 9h14M5 15h14',make:()=>{const s1=P('Lateral izq',300,1800,30,COLORS[0]);s1.x=-385;const s2=P('Lateral der',300,1800,30,COLORS[0]);s2.x=385;const sh=[400,900,1400].map((y,i)=>{const e=P('Estante '+(i+1),740,30,280,COLORS[2]);e.y=y;return e;});return[s1,s2,...sh];}},
 {cat:'Muebles',n:'Cajón',s:'500 · 5 piezas',icon:'M4 10h16v9H4zM4 10l2-5h12l2 5',make:()=>{const f=P('Frente',500,200,18,COLORS[0]);f.z=191;const b=P('Trasera',500,200,18,COLORS[0]);b.z=-191;const l=P('Lado izq',18,160,364,COLORS[2]);l.x=-241;l.y=90;const r=P('Lado der',18,160,364,COLORS[2]);r.x=241;r.y=90;const bot=P('Fondo',464,12,364,COLORS[2]);bot.y=16;return[f,b,l,r,bot];}},
 {cat:'Muebles',n:'Puerta',s:'600 × 1800',icon:'M6 3h12v18H6zM14 12h2',make:()=>[P('Puerta',600,1800,18,COLORS[1])]},
 {cat:'Muebles',n:'Silla',s:'450 · comedor',icon:'M7 3v9h10V3M7 12v9M17 12v9M7 12h10',make:()=>{const a=P('Asiento',450,40,450,COLORS[0]);a.y=450;const r=P('Respaldo',450,500,30,COLORS[0]);r.y=710;r.z=-210;const legs=[[-195,-195],[195,-195],[-195,195],[195,195]].map(([x,z],i)=>{const l=P('Pata '+(i+1),35,430,35,COLORS[1]);l.x=x;l.z=z;l.y=215;return l;});return[a,r,...legs];}},
 {cat:'Tiradores',n:'Perilla Ø32',s:'esfera cromo',icon:'M12 8a4 4 0 100 8 4 4 0 000-8zM12 16v4',make:()=>[SP('Perilla Ø32','sph',32,32,32,'#c0c4c8','m-jal')]},
 {cat:'Tiradores',n:'Tirador barra',s:'160 · cápsula',icon:'M4 12h16M7 12v4M17 12v4',make:()=>{const t=SP('Tirador barra','cap',12,160,12,'#c0c4c8','m-jal',{axis:'x',y:6});return[t];}},
 {cat:'Tiradores',n:'Tirador arco',s:'96 · cromo',icon:'M6 20v-8a6 6 0 0112 0v8',make:()=>[SP('Tirador arco','torus',96,12,12,'#c0c4c8','m-jal',{y:48})]},
 {cat:'Patas',n:'Pata cilíndrica',s:'Ø60 · h72',icon:'M8 3h8M12 3v18M8 21h8',make:()=>[CY('Pata cilíndrica Ø60',60,720,COLORS[1],'m-mad')]},
 {cat:'Patas',n:'Pata cónica',s:'Ø60→Ø20 · h45',icon:'M9 3h6l2 18H7z',make:()=>[SP('Pata cónica','cone',60,450,60,COLORS[1],'m-mad',{flip:true})]},
 {cat:'Patas',n:'Rueda con soporte',s:'Ø50 · h12 total',icon:'M12 15a4 4 0 100-8 4 4 0 000 8zM12 3v4M8 21h8',make:()=>{const s=SP('Soporte','box',60,70,40,'#c0c4c8','m-met');s.y=85;const r=SP('Rueda','cyl',50,50,20,'#1c1c1e','m-met',{axis:'x',y:25});return[s,r];}},
 {cat:'Luces',n:'Colgante',s:'Ø25 · pantalla',icon:'M12 3v6M6 17a6 6 0 0112 0v1H6z',make:()=>{const c=CY('Cable',8,400,'#3a3a3d','m-met');c.y=600;const s=SP('Pantalla','cone',250,180,250,'#e8dcc8','m-dec');s.y=310;const f=SP('Foco','sph',60,60,60,'#f5f0dc','m-led');f.y=260;return[c,s,f];}},
 {cat:'Luces',n:'Foco esfera',s:'Ø90',icon:'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4 12H2M22 12h-2',make:()=>[SP('Foco esfera Ø90','sph',90,90,90,'#f5f0dc','m-led')]},
 {cat:'Muebles',n:'Mesa redonda',s:'Ø90 · columna',icon:'M3 15h18M6 15v4M18 15v4M12 4v11',make:()=>{const t=CY('Cubierta redonda',900,40,COLORS[0],'m-mad');t.y=720;const c=CY('Columna',80,660,COLORS[1],'m-mad');c.y=370;const b=CY('Base',400,40,COLORS[1],'m-mad');b.y=20;return[t,c,b];}},
 {cat:'Muebles',n:'Taburete',s:'Ø35 · 3 patas',icon:'M5 8h14M7 8l-2 12M17 8l2 12M12 8v12',make:()=>{const a=CY('Asiento',350,50,COLORS[0],'m-mad');a.y=425;const ls=[[0,140],[125,-70],[-125,-70]].map(([x,z],i)=>{const l=CY('Pata '+(i+1),35,400,COLORS[1],'m-mad');l.x=x;l.z=z;l.y=200;return l;});return[a,...ls];}},
 {cat:'Muebles',n:'Toallero de pared',s:'barra 600',icon:'M4 12h16M4 12v4M20 12v4',make:()=>{const b=SP('Barra','cap',25,600,25,'#c0c4c8','m-met',{axis:'x',y:160});const s1=SP('Soporte izq','box',20,160,40,'#c0c4c8','m-met');s1.x=-280;s1.y=80;s1.z=12;const s2=SP('Soporte der','box',20,160,40,'#c0c4c8','m-met');s2.x=280;s2.y=80;s2.z=12;return[b,s1,s2];}},
 {cat:'Decoración',n:'Maceta',s:'Ø22 · h24',icon:'M7 10h10l-2 10H9zM5 6h14v4H5z',make:()=>[SP('Maceta','pot',220,240,160,'#c89b6d','m-dec')]},
 {cat:'Decoración',n:'Planta en maceta',s:'h86 total',icon:'M12 21V9M12 9C12 5 9 3 6 3c0 4 3 6 6 6zM12 12c0-4 3-6 6-6 0 4-3 6-6 6zM8 21h8',make:()=>{const p=SP('Maceta','pot',220,240,160,'#c89b6d','m-dec');p.y=120;const t=CY('Tronco',30,300,'#5b3a1e','m-mad');t.y=380;const f=SP('Follaje','sph',340,340,340,'#7fb069','m-dec');f.y=560;return[p,t,f];}},
 {cat:'Decoración',n:'Jarrón',s:'Ø16 · h32',icon:'M9 3h6M10 3c-2 3-4 5-4 9a6 6 0 0012 0c0-4-2-6-4-9',make:()=>[SP('Jarrón','vase',160,320,160,'#e8dcc8','m-dec')]},
 {cat:'Decoración',n:'Libros',s:'set · 4 pzas',icon:'M5 4h4v16H5zM11 6h4v14h-4zM17 9h3v11h-3z',make:()=>{let x=-66;return[[40,240,160,'#7a2e2e'],[35,220,150,'#2e4a7a'],[50,200,140,'#7fb069'],[30,180,130,'#5b3a1e']].map((d,i)=>{const b=SP('Libro '+(i+1),'box',d[0],d[1],d[2],d[3],'m-dec');b.x=x+d[0]/2;b.y=d[1]/2;x+=d[0]+6;return b;});}},
 {cat:'Decoración',n:'Frutero',s:'Ø24',icon:'M4 12h16a8 6 0 01-16 0zM12 6v6',make:()=>{const b=CY('Base',180,20,'#c0c4c8','m-dec');b.y=10;const a=SP('Aro','torus',240,40,240,'#c0c4c8','m-dec',{axis:'y',y:40});return[b,a];}},
 {cat:'Decoración',n:'Cesta',s:'Ø30 · h25',icon:'M5 8h14l-2 12H7zM5 8a7 3 0 0114 0',make:()=>{const p=SP('Cesta','pot',300,250,240,'#c89b6d','m-dec');p.y=125;const r=SP('Aro','torus',310,25,310,'#8b5a2b','m-dec',{axis:'y',y:250});return[p,r];}},
 {cat:'Decoración',n:'Espejo de pared',s:'Ø64',icon:'M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6',make:()=>{const m=CY('Espejo',600,20,'#e8dcc8','m-dec','z');m.y=1100;const f=SP('Marco','torus',640,30,640,'#3a3a3d','m-met',{y:1100});return[m,f];}},
 {cat:'Decoración',n:'Reloj de pared',s:'Ø30',icon:'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3',make:()=>{const d=CY('Reloj',300,25,'#e8dcc8','m-dec','z');d.y=1150;const h1=SP('Manecilla','box',14,90,12,'#1c1c1e','m-met');h1.y=1183;h1.z=16;const h2=SP('Minutero','box',70,14,12,'#1c1c1e','m-met');h2.x=27;h2.y=1150;h2.z=16;return[d,h1,h2];}},
];
function renderLib(){
 const cats=[...new Set(LIB.map(l=>l.cat))];
 $('libGrid').innerHTML=cats.map(c=>`<p class="libcat" aria-hidden="true">${esc(c)}</p><div class="libgrid">`+LIB.map((l,i)=>l.cat===c?`<button type="button" class="lib" data-i="${i}"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="${l.icon}"/></svg><div>${esc(l.n)}</div><small>${esc(l.s)}</small></button>`:'').join('')+`</div>`).join('');
 [...$('libGrid').querySelectorAll('.lib')].forEach(d=>d.onclick=()=>insertItems(LIB[+d.dataset.i].make()));
}
function insertItems(items){
 if(!items.length)return;
 pushUndo('insertar');
 const box=new THREE.Box3(),added=[];
 items.forEach(it=>{if(!it.matId&&!it.ghost)it.matId=defMat();cur().items.push(it);const m=addMesh(it);added.push(m);box.expandByObject(m);});
 const c=new THREE.Vector3();box.getCenter(c);
 items.forEach(it=>{it.x-=Math.round(c.x*1000);it.z-=Math.round(c.z*1000);applyToMesh(it);});
 setSel(added);renderCuts();fitAll();scheduleSave();
}
// objetos de corte para perforar: broca (cilindro) o muesca (caja) fantasma;
// se superponen a la pieza y se consumen al aplicar el corte (menú Acciones)
function addCutterObj(t,d1,d2){
 let c;
 if(t==='hole'){c=CY('Broca Ø'+d1,d1,400,'#d99a4e');c.ghost=true;}
 else{c=B('Muesca '+d1+'×'+d2,'#d99a4e');c.w=d1;c.h=300;c.d=d2;c.ghost=true;c.noCut=true;}
 insertItems([c]);
}
function renderTpls(){
 $('tplList').innerHTML=store.templates.length?store.templates.map(t=>`<div class="card" data-id="${esc(t.id)}"><b>${esc(t.name)}</b><br><small>${t.items.length} piezas · toca para insertar</small><div><button class="del" data-del="${esc(t.id)}">Borrar objeto</button></div></div>`).join(''):'<small style="color:var(--mut)">Vacía. Selecciona piezas y pulsa “Guardar selección”.</small>';
 [...$('tplList').querySelectorAll('.card')].forEach(c=>{c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label','Insertar objeto '+c.querySelector('b').textContent);
  c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}};
  c.onclick=e=>{
  if(e.target.dataset.del){store.templates=store.templates.filter(t=>t.id!==c.dataset.id);save();renderTpls();return;}
  const t=store.templates.find(t=>t.id===c.dataset.id);if(t)insertItems(JSON.parse(JSON.stringify(t.items)));
  };
 });
}
$('btnSaveTpl').onclick=()=>{
 const items=sel.length?sel.map(m=>m.userData.item):(tCtrl.object?[tCtrl.object.userData.item]:cur().items);
 if(!items.length)return alert('No hay piezas');
 const name=prompt('Nombre del objeto:');if(!name)return;
 const copy=JSON.parse(JSON.stringify(items));
 const xs=copy.map(i=>i.x),ys=copy.map(i=>i.y),zs=copy.map(i=>i.z);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2,my=Math.min(...ys);
 copy.forEach(i=>{i.x-=cx;i.z-=cz;i.y-=my;});
 store.templates.push({id:uid(),name:name.slice(0,80),items:copy});save();renderTpls();
};
