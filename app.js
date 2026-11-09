import * as THREE from './assets/three.module.js';
import { createGameEngine } from './babylon-engine.js';
import { HISTORICAL_LAYOUT, ERA_EVIDENCE } from './historical-layout.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ERA={
 '1869':{kicker:'DIE STADT UM 1869',title:'Noch steht das Schloss.',copy:'Wo heute der Blick zum Rhein frei ist, stehen noch Schlossflügel. Kunstakademie und Ständehaus haben die frühere Residenz mit neuem Leben gefüllt. Drei Jahre später verändert ein Brand den Ort für immer.',image:'1869',sub:'Historische Aufnahme · 1869',caption:'Altes Schloss in Düsseldorf, 1869. Unbekannte Urheberschaft. Überlieferung: Stadtarchiv Düsseldorf, via Wikimedia Commons. Gemeinfrei.',url:'https://commons.wikimedia.org/wiki/File:Altes_Schloss_in_D%C3%BCsseldorf_im_Jahre_1869,_wiederaufgebaut_als_Versammlungshaus_der_rheinischen_St%C3%A4nde._St%C3%A4ndehaus_(links)_Galeriegeb%C3%A4ude_(Mitte)_und_Schlo%C3%9Fturm_(rechts).jpg'},
 '1908':{kicker:'DIE STADT UM 1908',title:'Der Platz öffnet sich.',copy:'Das Schloss ist verschwunden, der Turm bleibt. Marktstände und eine Straßenbahn beleben den Burgplatz. Am neuen Rheinufer steht das verspielte Düsselschlösschen. Eine Postkarte von 1908 hält diesen Moment fest.',image:'1908',sub:'Historische Postkarte · 1908',caption:'Burgplatz mit Schlossturm und Galeriegebäude, 1908. Postkarte von Albert Juch, Stadtmuseum Düsseldorf, via Wikimedia Commons. Gemeinfrei.',url:'https://commons.wikimedia.org/wiki/File:Burgplatz_Duesseldorf.jpg'},
 'heute':{kicker:'DIE STADT DER GEGENWART',title:'Zurück an den Rhein.',copy:'Der Verkehr ist unter die Erde gezogen. Seit 1995 verbinden Promenade und Freitreppe die Altstadt wieder mit dem Fluss. Im Schlossturm erzählt das SchifffahrtMuseum von einer Stadt, die ohne den Rhein nicht denkbar wäre.',image:'heute',sub:'Vergleichsfoto · 2025',caption:'Dietmar Rabich / Wikimedia Commons / „Düsseldorf, Schlossturm -- 2025 -- 2573“ / CC BY-SA 4.0. Für die Anzeige verkleinert.',url:'https://commons.wikimedia.org/wiki/File:D%C3%BCsseldorf,_Schlossturm_--_2025_--_2573.jpg'}
};
let era='1908',evening=false,touring=false,stopIndex=0,world,buckets,colliders=[],landmarks=[],tween=null;
let game=null,npcSystem=null,npcGeneration=0,initialContentReady=false,encounter=null;
const clock=new THREE.Clock(), V=THREE.Vector3;
let seed=1928;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}function range(a,b){return a+rand()*(b-a);}
const scene=new THREE.Scene();scene.background=new THREE.Color('#ced7d3');scene.fog=new THREE.FogExp2('#c9d1c8',.0019);
const DEFAULT_FOV=61;
const camera=new THREE.PerspectiveCamera(DEFAULT_FOV,innerWidth/innerHeight,.12,1800);camera.rotation.order='YXZ';
// Three supplies geometry and camera math. Babylon owns the actual game renderer.
const renderer={capabilities:{getMaxAnisotropy:()=>8},info:{render:{calls:0,triangles:0}},setSize(){}};
const gameCanvas=document.createElement('canvas');gameCanvas.id='game-canvas';gameCanvas.setAttribute('aria-label','Historische 3D-Stadtsimulation');$('#viewport').append(gameCanvas);

function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const noiseCanvas=(ctx,w,h,base,amount)=>{ctx.fillStyle=base;ctx.fillRect(0,0,w,h);for(let i=0;i<w*h/7;i++){let n=rand()*amount;ctx.fillStyle=`rgba(${rand()>.5?'255,250,225':'25,30,25'},${n})`;ctx.fillRect(rand()*w,rand()*h,1+rand()*3,1+rand()*3);}};
const stone=canvasTexture(1024,1024,(c,w,h)=>{noiseCanvas(c,w,h,'#b9b09b',.13);for(let y=0;y<h;y+=64){for(let x=-128;x<w;x+=128){const off=(y/64%2)*64;c.fillStyle=`hsl(40,${range(6,13)}%,${range(63,74)}%)`;c.fillRect(x+off+1,y+1,126,62);c.strokeStyle='#8a857766';c.lineWidth=1;c.strokeRect(x+off,y,128,64);for(let j=0;j<35;j++){c.fillStyle=rand()>.5?'#fff2':'#342e2010';c.fillRect(x+off+rand()*126,y+rand()*63,range(1,9),1);}}}});stone.wrapS=stone.wrapT=THREE.RepeatWrapping;
stone.repeat.set(3,3);
const plaster=canvasTexture(256,256,(c,w,h)=>noiseCanvas(c,w,h,'#e1dbca',.1));plaster.wrapS=plaster.wrapT=THREE.RepeatWrapping;plaster.repeat.set(7,7);
const cobble=canvasTexture(1024,1024,(c,w,h)=>{c.fillStyle='#888579';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=-64;x<w;x+=64){const off=(y/32%2)*32,l=range(48,66);c.fillStyle=`hsl(${range(33,47)},${range(2,9)}%,${l}%)`;c.beginPath();c.roundRect(x+off+1,y+1,62,30,4);c.fill();c.strokeStyle='#e9e5ce35';c.strokeRect(x+off+2,y+2,59,27);for(let j=0;j<14;j++){c.fillStyle=rand()>.5?'#fff1':'#0001';c.fillRect(x+off+range(2,60),y+range(2,29),range(1,5),1);}}});cobble.wrapS=cobble.wrapT=THREE.RepeatWrapping;cobble.repeat.set(38,38);
const roofTex=canvasTexture(512,512,(c,w,h)=>{c.fillStyle='#464c4b';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let x=-20;x<w;x+=30){const off=(y/16%2)*15;c.fillStyle=`hsl(193,${range(1,7)}%,${range(20,31)}%)`;c.fillRect(x+off,y,29,15);c.fillStyle='#d0d4c320';c.fillRect(x+off,y,29,1);}});roofTex.wrapS=roofTex.wrapT=THREE.RepeatWrapping;roofTex.repeat.set(3,3);
const windowTex=canvasTexture(128,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#9daba4');gr.addColorStop(.4,'#4e635e');gr.addColorStop(.45,'#79817a');gr.addColorStop(1,'#172b29');c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='#b1b2a44a';c.beginPath();c.moveTo(0,30);c.lineTo(110,0);c.lineTo(0,130);c.fill();c.fillStyle='#ddd8c630';c.fillRect(6,0,18,h);c.fillStyle='#171d1b';c.fillRect(0,0,5,h);c.fillRect(123,0,5,h);c.fillRect(0,0,w,5);c.fillRect(0,250,w,6);c.fillRect(61,0,5,h);c.fillRect(0,110,w,6);});
const archTex=canvasTexture(256,384,(c,w,h)=>{c.clearRect(0,0,w,h);const glass=c.createLinearGradient(0,0,256,384);glass.addColorStop(0,'#a0aaa4');glass.addColorStop(.36,'#53625e');glass.addColorStop(.38,'#9a9c8e');glass.addColorStop(1,'#152523');c.fillStyle=glass;c.beginPath();c.moveTo(20,h);c.lineTo(20,120);c.arc(128,120,108,Math.PI,0);c.lineTo(236,h);c.closePath();c.fill();c.strokeStyle='#8d6e58';c.lineWidth=16;c.stroke();c.strokeStyle='#41443b';c.lineWidth=5;for(let x=60;x<220;x+=34){c.beginPath();c.moveTo(x,110);c.lineTo(x,h);c.stroke();}c.beginPath();c.moveTo(20,210);c.lineTo(236,210);c.stroke();});
const shadowTex=canvasTexture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);g.addColorStop(0,'#0008');g.addColorStop(.6,'#0003');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(0,0,w,h);});
// Photographically captured, CC0 material maps. Normal and roughness maps remain linear.
const textureLoader=new THREE.TextureLoader();
const pbrDefinitions=[[stone,'large_sandstone_blocks',5,5],[plaster,'painted_plaster_wall',3,3],[cobble,'cobblestone_floor_02',88,144],[roofTex,'grey_roof_tiles',2,2]];
const pbr=new Map();
await Promise.all(pbrDefinitions.map(async([fallback,id,rx,ry])=>{try{const maps=await Promise.all(['Diffuse','nor_gl','Rough','AO'].map(k=>textureLoader.loadAsync(`assets/pbr/${id}_${k}.jpg`)));maps.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(i===0)t.colorSpace=THREE.SRGBColorSpace;});pbr.set(fallback,{map:maps[0],normalMap:maps[1],roughnessMap:maps[2],aoMap:maps[3],aoMapIntensity:.5,normalScale:new THREE.Vector2(.45,.45)});}catch(e){console.warn('Material fallback',id);}}));
const brickMaps=await Promise.all(['Diffuse','nor_gl','Rough'].map(k=>textureLoader.loadAsync(`assets/pbr/brick_wall_04_${k}.jpg`).catch(()=>null)));
brickMaps.forEach((t,i)=>{if(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,6);if(i===0)t.colorSpace=THREE.SRGBColorSpace;}});
const woodMaps=await Promise.all(['Diffuse','nor_gl','Rough'].map(k=>textureLoader.loadAsync(`assets/pbr/wood_${k}.jpg`).catch(()=>null)));woodMaps.forEach((t,i)=>{if(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);if(i===0)t.colorSpace=THREE.SRGBColorSpace;}});
const facadeSource=await textureLoader.loadAsync('assets/facade-atlas.jpg').catch(()=>null);
const facadeMaterials=Array.from({length:6},(_,i)=>{if(!facadeSource)return null;const t=facadeSource.clone();t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(1/3,.5);t.offset.set((i%3)/3,i<3?.5:0);t.anisotropy=8;t.needsUpdate=true;return new THREE.MeshStandardMaterial({map:t,color:0xffffff,roughness:.9});});
const matCache=new Map();function material(color,map=null,extra={}){const k=color+'|'+(map?.uuid||'')+JSON.stringify(extra);if(!matCache.has(k))matCache.set(k,new THREE.MeshStandardMaterial({color,map,roughness:.84,envMapIntensity:.45,...(pbr.get(map)||{}),...extra}));return matCache.get(k);}
const mStone=material('#e9dfc7',stone),mTrim=material('#ac8d73'),mRoof=material('#a3adb0',roofTex),mGlass=material('#d0ded9',windowTex,{roughness:.28,metalness:.12}),mDark=material('#333e3a');
// Geometries are instanced by material to keep walking smooth on ordinary laptops.
const boxGeo=new THREE.BoxGeometry(1,1,1),planeGeo=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
function instance(geo,mat,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){const key=geo.uuid+mat.uuid;if(!buckets.has(key))buckets.set(key,{geo,mat,items:[]});dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();buckets.get(key).items.push(dummy.matrix.clone());}
function box(x,y,z,w,h,d,mat,ry=0){instance(boxGeo,mat,x,y,z,w,h,d,ry);}
function mesh(geo,mat,x=0,y=0,z=0,parent=world){const a=new THREE.Mesh(geo,mat);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function cylinder(x,y,z,rt,rb,h,mat,n=40){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z);}
function pole(a,b,r,mat){const p=new V(...a),q=new V(...b),d=q.clone().sub(p);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),6),mat,...p.add(q).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new V(0,1,0),d.normalize());return o;}
function groundShadow(x,z,w,d){const o=mesh(planeGeo,material('#342b20',shadowTex,{transparent:true,depthWrite:false,opacity:.5}),x,.025,z);o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);o.castShadow=false;}
function windowAt(x,y,z,w,h,ry=0,trim=mTrim,arched=false){const dx=Math.cos(ry),dz=-Math.sin(ry),nx=Math.sin(ry),nz=Math.cos(ry);instance(planeGeo,arched?material('#ffffff',archTex,{transparent:true,alphaTest:.1,side:THREE.DoubleSide}):mGlass,x,y,z,w,h,1,ry);if(!arched){for(const s of [-1,1])box(x+dx*s*(w/2+.06),y,z+dz*s*(w/2+.06),.1,h+.2,.15,trim,ry);box(x,y+h/2+.07,z,w+.26,.13,.17,trim,ry);}box(x+nx*.1,y-h/2-.09,z+nz*.1,w+.42,.18,.42,trim,ry);}
function roof(x,y,z,w,d,h,mat=mRoof,ry=0){const geo=new THREE.BufferGeometry();const ps=[-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,0,h,d/2,w/2,0,d/2,-w/2,0,-d/2,0,h,-d/2,0,h,d/2,-w/2,0,-d/2,0,h,d/2,-w/2,0,d/2,w/2,0,-d/2,w/2,0,d/2,0,h,d/2,w/2,0,-d/2,0,h,d/2,0,h,-d/2];geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.computeVertexNormals();const uv=[];for(let i=0;i<ps.length;i+=3)uv.push((ps[i]+w/2)/4,(ps[i+1]+ps[i+2])/4);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const o=mesh(geo,mat,x,y,z);o.rotation.y=ry;return o;}
function building(x,z,w,d,h,color,{rotation=0,front=0,decor=1,gabled=false,shop='',collision=true,atlas=-1}={}){
 const wall=material(color,plaster);box(x,h/2,z,w,h,d,wall,rotation);groundShadow(x,z,w+5,d+5);
 const cs=Math.cos(rotation),sn=Math.sin(rotation),at=(lx,yy,lz)=>[x+lx*cs+lz*sn,yy,z-lx*sn+lz*cs];
 const put=(lx,yy,lz,ww,hh,dd,ma)=>box(...at(lx,yy,lz),ww,hh,dd,ma,rotation);
 const trim=material(decor?'#d1c5aa':'#a9a79b');put(0,.6,0,w+.16,1.2,d+.15,mStone);put(0,h-.15,0,w+.55,.3,d+.55,trim);
 const floors=Math.max(2,Math.floor(h/3.8)),cols=Math.max(2,Math.round(w/2.8));
 if(atlas>=0&&facadeMaterials[atlas]){
  const panels=Math.max(1,Math.round(w/8));for(let panel=0;panel<panels;panel++)instance(planeGeo,facadeMaterials[atlas],...at((panel-(panels-1)/2)*w/panels,h/2,d/2+.11),w/panels,h,1,rotation);
  // Real geometry under the image-based elevations adds parallax and contact shadows.
  for(const f of [.4,.61,.81])for(const c of [-1,0,1])put(c*w*.298,h*f-h*.064,d/2+.19,w*.22,.12,.34,trim);
  for(const y of [h-.1,h-.36,h*.26])put(0,y,d/2+.14,w+.2,.12,.36,trim);
 }else for(let f=0;f<floors;f++){const yy=2.2+f*(h-2.8)/floors;for(let c=0;c<cols;c++){const lx=(c-(cols-1)/2)*w/(cols+.3);windowAt(...at(lx,yy,d/2+.035),w/cols*.43,2.05,rotation,trim,decor>1&&f===0);if(decor>1&&f>0){put(lx,yy+1.25,d/2+.13,w/cols*.63,.13,.3,trim);}}if(decor&&f>0)put(0,yy-1.5,d/2+.08,w,.13,.19,trim);}
 // Side elevations prevent a flat postcard effect when walking around the buildings.
 for(let side of [-1,1])for(let f=0;f<floors;f++)for(let j=0;j<Math.max(2,Math.floor(d/3.5));j++){const zz=(j-(Math.max(2,Math.floor(d/3.5))-1)/2)*3.2;windowAt(...at(side*(w/2+.03),2.2+f*(h-2.8)/floors,zz),1.2,1.85,rotation+side*Math.PI/2,trim);}
 const roofH=gabled?w*.65:Math.min(w*.34,4.5);roof(x,h,z,w+.6,d+.7,roofH,mRoof,rotation);
 for(let j=0;j<Math.max(1,Math.floor(d/11));j++){put(w*.2,h+roofH*.65,(j-.3)*4,.75,2.4,.9,material('#7e7262',stone));}
 if(gabled){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,roofH);s.closePath();const g=new THREE.ShapeGeometry(s),p=at(0,h,d/2+.04);const a=mesh(g,wall,...p);a.rotation.y=rotation;windowAt(...at(0,h+roofH*.36,d/2+.07),1,1.5,rotation,trim);}
 if(shop&&atlas<0){const tex=canvasTexture(512,64,(c,W,H)=>{c.fillStyle=era==='heute'?'#30473d':'#504d39';c.fillRect(0,0,W,H);c.fillStyle='#f2e7cc';c.font='24px Georgia';c.textAlign='center';c.fillText(shop,W/2,43);});instance(planeGeo,material('#fff',tex),...at(0,3.6,d/2+.16),w*.8,.64,1,rotation);}
 if(collision){const ww=Math.abs(cs*w)+Math.abs(sn*d),dd=Math.abs(cs*d)+Math.abs(sn*w);colliders.push({x,z,w:ww,d:dd});}
}
function ring(x,z,y,r,h,mat,n=48){return cylinder(x,y,z,r,r,h,mat,n);}
function makeTower(){const x=-13,z=-19;const towerWall=material('#f6eee0',plaster),red=material('#9f7865',plaster);
 cylinder(x,9.7,z,5.5,5.7,19.4,towerWall,64);groundShadow(x,z,20,20);
 for(const y of [1.1,5,10.6,15.5,19.3])ring(x,z,y,y===19.3?5.9:5.68,.22,red);
 for(let level=0;level<3;level++)for(let j=0;j<8;j++){const a=j*Math.PI/4+.1,r=5.6,yy=3.15+level*5.1;windowAt(x+Math.sin(a)*r,yy,z+Math.cos(a)*r,level===2?.48:.32,level===2?1.15:.85,a,red);}
 // The upper Renaissance lantern is octagonal, unlike the round lower shaft.
 cylinder(x,21.65,z,5.55,5.55,4.6,towerWall,8);ring(x,z,19.6,5.9,.4,red,8);ring(x,z,23.9,6.05,.4,red,8);
 for(let j=0;j<8;j++){const a=j*Math.PI/4+Math.PI/8,r=5.19;for(const side of [-1,1])windowAt(x+Math.sin(a)*r+Math.cos(a)*side*.79,21.6,z+Math.cos(a)*r-Math.sin(a)*side*.79,1.31,3.25,a,red,true);pole([x+Math.sin(a)*5.24,19.9,z+Math.cos(a)*5.24],[x+Math.sin(a)*5.24,23.35,z+Math.cos(a)*5.24],.105,red);const b=j*Math.PI/4;pole([x+Math.sin(b)*5.55,19.7,z+Math.cos(b)*5.55],[x+Math.sin(b)*5.55,23.8,z+Math.cos(b)*5.55],.13,red);}
 // Narrow double mouldings and engaged columns model the lantern's sandstone articulation.
 for(const y of [5.12,10.72,15.62,19.8,23.65,24.15])ring(x,z,y,y>19?5.91:5.7,.075,red,y>19?8:64);
 for(let j=0;j<8;j++){const a=j*Math.PI/4+Math.PI/8;for(const side of [-1,1]){const tang=a+Math.PI/2,xx=x+Math.sin(a)*5.23+Math.sin(tang)*side*1.55,zz=z+Math.cos(a)*5.23+Math.cos(tang)*side*1.55;pole([xx,20,zz],[xx,23.35,zz],.09,red);cylinder(xx,20,zz,.16,.16,.18,red,12);cylinder(xx,23.35,zz,.18,.12,.22,red,12);}}
 const metal=material('#3d4541');
 if(era==='heute'){cylinder(x,25.1,z,.65,6.3,2.2,mRoof,8);pole([x,26.1,z],[x,28.5,z],.07,metal);box(x+.55,28.2,z,1.4,.37,.05,metal);}
 else {ring(x,z,24.2,5.9,.22,red,8);for(let j=0;j<16;j++){const a=j*Math.PI/8;pole([x+Math.sin(a)*5.7,24.2,z+Math.cos(a)*5.7],[x+Math.sin(a)*5.7,25.1,z+Math.cos(a)*5.7],.045,metal);}ring(x,z,25.1,5.8,.09,metal,16);for(let j=0;j<8;j++){const a=j*Math.PI/4;pole([x+Math.sin(a)*5.65,25.1,z+Math.cos(a)*5.65],[x,29,z],.045,metal);}pole([x,29,z],[x,30.4,z],.055,metal);}
 if(era!=='1869'){box(x,1.6,z+5.7,2.3,3.2,.4,red);box(x,1.4,z+5.94,1.55,2.8,.12,mDark);box(x,3.45,z+5.9,3.1,.4,1.3,red);for(let j=0;j<9;j++)box(x-1.4+j*.35,4.05,z+6.3,.07,.85,.07,red);box(x,4.5,z+6.3,3,.1,.1,red);}
 colliders.push({x,z,r:6.2});
}
function church(){const brick=material('#e1c4aa',null,{map:brickMaps[0],normalMap:brickMaps[1],roughnessMap:brickMaps[2],normalScale:new THREE.Vector2(.5,.5)}),slate=material('#717d7c',roofTex);const x=17,z=-83;
 const tuff=material('#e4d1ad',plaster,{normalMap:pbr.get(stone)?.normalMap,normalScale:new THREE.Vector2(.22,.22)});box(x,9,z,20,18,37,brick);for(const aisle of [-1,0,1])roof(x+aisle*6.7,18,z,7,38,5.8,slate);box(x,16,z+23,10,32,10,tuff);roof(x,32,z+23,11,11,1,slate);
 for(const s of [-1,1])for(let i=0;i<6;i++){box(x+s*10.3,6.5,z-14+i*5.5,1,13,1.2,brick);windowAt(x+s*10.05,12,z-14+i*5.5,2.1,7,s*Math.PI/2,mTrim,true);}
 for(let i=0;i<3;i++)windowAt(x+(i-1)*2.65,29,z+28.05,1.75,4,0,mTrim,true);
 // A gently twisting taper suggests St. Lambertus's characteristic spire.
 const vertices=[],uvs=[],indices=[],sides=12,rings=16;
 for(let j=0;j<=rings;j++){const t=j/rings,y=33+t*35,r=5.35*Math.pow(1-t,1.35)+.02;for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2+t*.36;vertices.push(x+Math.cos(angle)*r+Math.pow(t,3)*1.1,y,z+23+Math.sin(angle)*r);uvs.push(k/sides,t*4);}}
 for(let j=0;j<rings;j++)for(let k=0;k<sides;k++){const a=j*(sides+1)+k,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,slate);pole([x+1,67,z+23],[x+1,70,z+23],.055,mDark);pole([x+.25,69,z+23],[x+1.75,69,z+23],.04,mDark);
 const darkBrick=material('#b7a68a',plaster);
 for(const h of [10,23.8,26,31.8]){box(x,h,z+28.1,10.2,.18,.28,darkBrick);box(x+5.1,h,z+23,.28,.18,10.2,darkBrick);box(x-5.1,h,z+23,.28,.18,10.2,darkBrick);}
 for(const side of [-1,1])for(let h=1;h<32;h+=.55){box(x+side*4.8,h,z+28.16,.4,.27,.35,darkBrick);}
 for(const xx of [x-2.7,x,x+2.7]){for(const off of [-1,1])box(xx+off*1.12,16.4,z+28.12,.13,12.7,.12,darkBrick);const arc=mesh(new THREE.TorusGeometry(1.12,.065,5,16,Math.PI),darkBrick,xx,22.7,z+28.13);}
 for(const side of [-1,1])for(const back of [-1,1]){cylinder(x+side*4.7,33.5,z+23+back*4.7,.38,.55,4.2,tuff,8);cylinder(x+side*4.7,37,z+23+back*4.7,0,.8,3.7,slate,8);}
 const ct=canvasTexture(256,256,(c)=>{c.fillStyle='#192d28';c.beginPath();c.arc(128,128,118,0,Math.PI*2);c.fill();c.strokeStyle='#dbc47c';c.lineWidth=6;c.stroke();c.font='20px Georgia';c.textAlign='center';for(let i=1;i<=12;i++){const a=i*Math.PI/6;c.fillStyle='#e5dca1';c.fillText(String(i),128+Math.sin(a)*88,135-Math.cos(a)*88);}c.strokeStyle='#e5dca1';c.lineWidth=6;c.beginPath();c.moveTo(128,128);c.lineTo(91,90);c.moveTo(128,128);c.lineTo(180,76);c.stroke();});
 for(const a of [0,Math.PI/2,-Math.PI/2]){instance(planeGeo,material('#fff',ct),x+Math.sin(a)*5.5,33.2,z+23+Math.cos(a)*5.5,1.7,1.7,1,a);}
 colliders.push({x,z:z+4,w:23,d:55});
}
function historicalChurch(){
 const savedWorld=world,savedBuckets=buckets,colliderStart=colliders.length;
 const content=new THREE.Group();world=content;buckets=new Map();church();
 for(const {geo,mat,items} of buckets.values()){const m=new THREE.InstancedMesh(geo,mat,items.length);items.forEach((a,i)=>m.setMatrixAt(i,a));m.castShadow=geo!==planeGeo;m.receiveShadow=true;m.computeBoundingSphere();content.add(m);}
 const sourceColliders=colliders.splice(colliderStart);world=savedWorld;buckets=savedBuckets;
 // Source-visible east-west orientation; metre offsets are an explicitly inferred estimate.
 const layout=HISTORICAL_LAYOUT.church;const pivot=new THREE.Group();pivot.position.set(layout.correctedWestTowerXZ[0],0,layout.correctedWestTowerXZ[1]);pivot.rotation.y=layout.rotationY;content.position.set(-layout.legacyWestTowerXZ[0],0,-layout.legacyWestTowerXZ[1]);pivot.add(content);world.add(pivot);
 for(const c of sourceColliders)colliders.push({x:7-(c.z+60),z:-81+(c.x-17),w:c.d,d:c.w});
}
function palace(){const pale='#d0c6ad';building(-31,-20,26,12,15.5,pale,{atlas:0,decor:2,collision:true});building(-38,5,12,39,14.5,'#d6cdb9',{rotation:Math.PI/2,atlas:4,decor:1});building(-15,29,37,12,15,'#c9bda5',{atlas:0,decor:2});
 // Quiet courtyard and a low boundary wall, based on the historic footprint.
 box(-14,.55,11,1,1.1,27,mStone);box(-3,.55,23,21,1.1,1,mStone);
}
function gallery(){const x=-10,z=38;building(x,z,40,12,16.5,'#ded1b7',{atlas:1,decor:2});const trim=material('#c7b99c',plaster);for(let i=0;i<12;i++){const xx=x-18.2+i*3.31;box(xx,10.8,z+6.16,.35,9,.42,trim);box(xx,15.5,z+6.3,.7,.4,.75,trim);box(xx,6.4,z+6.3,.6,.3,.65,trim);}for(const yy of [5.7,6.1,15.7,16.1,16.5])box(x,yy,z+6.25,40.6,.18,.7,trim);for(let i=0;i<11;i++){const xx=x-16.6+i*3.32;const shape=new THREE.Shape();shape.moveTo(-1.15,0);shape.lineTo(1.15,0);shape.lineTo(0,.62);shape.closePath();mesh(new THREE.ShapeGeometry(shape),trim,xx,14.8,z+6.48);}}

function dussel(){const x=-40,z=-23,ma=material('#d8c6a2',stone),trim=material('#a99573');box(x,5,z,9,10,11,ma);roof(x,10,z,9.6,12,7,mRoof);box(x-4.5,7,z-3,3.4,14,3.4,ma);cylinder(x-4.5,15.3,z-3,1.3,2.2,3,mRoof,8);cylinder(x-4.5,16.5,z-3,1.05,1.05,1.7,ma,8);const onion=[new THREE.Vector2(0,0),new THREE.Vector2(.95,0),new THREE.Vector2(1.35,.65),new THREE.Vector2(1.45,1.3),new THREE.Vector2(1.2,2),new THREE.Vector2(.55,2.8),new THREE.Vector2(.18,3.4),new THREE.Vector2(0,3.9)];mesh(new THREE.LatheGeometry(onion,24),mRoof,x-4.5,17.2,z-3);pole([x-4.5,19.3,z-3],[x-4.5,23,z-3],.04,mDark);
 for(let j=0;j<3;j++)windowAt(x+(j-1)*2.5,3,z+5.58,1.5,3,0,trim,true);for(let j=0;j<2;j++)windowAt(x+(j-.5)*3.6,7.5,z+5.58,1.8,2.6,0,trim,true);
 const s=new THREE.Shape();s.moveTo(-4.6,0);s.lineTo(-4.1,2);s.bezierCurveTo(-3.5,2,-3,3.2,-2.8,4);s.lineTo(-1.4,6.9);s.lineTo(0,8);s.lineTo(1.4,6.9);s.lineTo(2.8,4);s.bezierCurveTo(3,3.2,3.5,2,4.1,2);s.lineTo(4.6,0);s.closePath();mesh(new THREE.ShapeGeometry(s),ma,x,10,z+5.65);windowAt(x,12.2,z+5.7,1.3,1.8,0,trim);box(x,9.8,z+6,9.8,.25,.7,trim);
 for(const xx of [-4.7,4.7]){pole([x+xx,10,z+5.7],[x+xx,13,z+5.7],.12,trim);cylinder(x+xx,13.15,z+5.7,0,.32,.7,trim,8);}for(const yy of [2.2,5.2,9.8,10.1])box(x,yy,z+5.75,9.6,.16,.42,trim);
 for(const side of [-1,1]){const xx=x+side*4.4;box(xx,5.2,z+5.6,.35,9.8,.35,trim);}
 // Protruding river-facing bay and balcony, with an actual balustrade.
 box(x,6.8,z+6.25,4.4,.28,1.7,trim);for(let j=0;j<9;j++){box(x-2+j*.5,7.4,z+7,.09,1.1,.09,trim);}box(x,7.95,z+7,4.5,.14,.18,trim);
 windowAt(x,7.6,z+5.82,3.2,2.8,0,trim,true);
 for(let j=0;j<8;j++){const a=j*Math.PI/4;windowAt(x-4.5+Math.sin(a)*1.06,16.5,z-3+Math.cos(a)*1.06,.5,.9,a,trim);}
 colliders.push({x,z,w:12,d:13});groundShadow(x,z,18,20);
}
function umbrella(x,z,r,color,striped=false){const mast=material('#776c52');pole([x,0,z],[x,3.2,z],.045,mast);const o=cylinder(x,2.85,z,.08,r,.65,material(color),12);if(striped){const g=o.geometry,co=[];const p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i));const c=new THREE.Color(Math.floor((a+Math.PI)/(Math.PI/6))%2===0?color:'#e7dfc7');co.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(co,3));o.material=material('#fff',null,{vertexColors:true});}}
function market(){
 const wood=material('#c9b89b',null,{map:woodMaps[0],normalMap:woodMaps[1],roughnessMap:woodMaps[2],normalScale:new THREE.Vector2(.3,.3)});
 for(let i=0;i<8;i++){const x=-23+(i%3)*8,z=-2+Math.floor(i/3)*9;umbrella(x,z,2.7,i%3===0?'#aa9674':'#d1c8ad',i%3===0);
  box(x,1.04,z,3.6,.16,1.5,wood);for(const a of [-1,1])for(const b of [-1,1])box(x+a*1.5,.5,z+b*.55,.12,1,.12,wood);box(x,.4,z,3.1,.1,1.1,wood);
  for(let j=0;j<3;j++){const xx=x-1.15+j*1.15;box(xx,1.15,z,1.02,.09,1.15,wood);for(const sign of [-1,1]){box(xx+sign*.52,1.3,z,.07,.36,1.2,wood);box(xx,1.3,z+sign*.56,1.05,.36,.06,wood);}for(let k=0;k<18;k++){const ma=material(['#8b9e56','#b58d43','#b36e47'][j]);const fruit=mesh(new THREE.SphereGeometry(.09+rand()*.035,7,5),ma,xx+range(-.4,.4),1.27+range(0,.1),z+range(-.43,.43));fruit.scale.y=.85;}}
  colliders.push({x,z,w:3.7,d:1.7});
 }
}
function tram(){const g=new THREE.Group();world.add(g);const ma=material('#5d352b');const x=21,z=13;box(x,1.7,z,2.65,2.65,8.8,ma);box(x,3.2,z,3,.25,9.1,material('#68736a'));box(x,1.05,z,2.76,.18,9,material('#c7bda1'));for(let side of [-1,1]){for(let j=0;j<5;j++)windowAt(x+side*1.34,2.25,z+(j-2)*1.45,.95,1.3,side*Math.PI/2,material('#bcb28f'));for(let j=0;j<2;j++){const wheel=cylinder(x+side*1.2,.5,z+(j-.5)*5.7,.4,.4,.18,mDark,16);wheel.rotation.z=Math.PI/2;}}windowAt(x,2.15,z+4.42,1.5,1.4,0,material('#c4b996'));pole([x,3.35,z],[x,6,z-2],.05,mDark);pole([x,6,z-2],[x,6.2,z-3],.05,mDark);colliders.push({x,z,w:3.4,d:9.7});}
function lamp(x,z,modern=false){const metal=material('#3d5146');pole([x,0,z],[x,modern?5.5:4.4,z],.065,metal);if(modern){box(x,5.65,z,.65,.12,.65,metal);cylinder(x,5.4,z,.24,.24,.4,material('#eee4bb',null,{emissive:'#edd8a1',emissiveIntensity:evening?.7:.1}),8);}else{cylinder(x,4.65,z,.28,.18,.65,material('#e0d6b1',null,{emissive:'#b7a979',emissiveIntensity:evening?.6:0}),4);cylinder(x,5.1,z,0,.42,.3,metal,4);} }
function tree(x,z,r=4){const trunk=material('#7b7160');cylinder(x,3,z,.18,.32,6,trunk,8);for(let i=0;i<6;i++){const o=mesh(new THREE.IcosahedronGeometry(r*range(.7,1.05),2),material(['#65745b','#718061','#7c896b'][i%3]),x+range(-1.7,1.7),6+range(-1,2.5),z+range(-1.7,1.7));o.scale.y=.8;}groundShadow(x,z,12,12);}
function presentLandmarks(){
 const x=26,z=4,limestone=material('#b9b4a4',plaster),bronze=material('#45574a',null,{metalness:.65,roughness:.6});
 cylinder(x,.25,z,2.6,2.6,.5,limestone,48);const rim=mesh(new THREE.TorusGeometry(2.45,.17,8,48),limestone,x,.55,z);rim.rotation.x=Math.PI/2;cylinder(x,.45,z,2.24,2.24,.04,material('#6c8c82',null,{metalness:.25,roughness:.25}),48);box(x,1.4,z,1.05,2.25,.8,limestone);
 // Small sculptural silhouettes stand for the two cartwheel figures; anatomy is simplified.
 for(const side of [-1,1]){const xx=x+side*.7;pole([xx-.27,2.5,z],[xx,3,z],.12,bronze);pole([xx,3,z],[xx+.35,3.4,z],.1,bronze);pole([xx,3,z],[xx-.35,3.42,z],.1,bronze);pole([xx-.27,2.5,z],[xx-.57,2.2,z],.08,bronze);pole([xx-.27,2.5,z],[xx+.02,2.2,z],.08,bronze);const head=mesh(new THREE.SphereGeometry(.17,10,8),bronze,xx-.32,2.25,z);}
 colliders.push({x,z,r:2.8});groundShadow(x,z,7,7);
 for(const t of [[24,18],[33,18],[31,-11]])tree(t[0],t[1],3.5);
 const mosaic=canvasTexture(1024,384,(c,w,h)=>{c.fillStyle='#78aca5';c.fillRect(0,0,w,h);const colors=['#387e9b','#438baf','#76aaad','#b6cbb0','#d1c19a','#668f9a','#7cb4ba','#417e9b'];for(let i=0;i<18000;i++){c.fillStyle=colors[Math.floor(rand()*colors.length)];c.beginPath();c.arc(rand()*w,rand()*h,range(.7,3.1),0,Math.PI*2);c.fill();}});
 const mosaicWall=material('#fff',mosaic);box(-46.7,-.4,-4.8,8.2,2.9,.35,mosaicWall);box(-46.7,-.4,20.8,8.2,2.9,.35,mosaicWall);
}
function bench(x,z,ry=0){const wood=material('#817c64'),iron=material('#46534a');for(let j=0;j<4;j++){instance(boxGeo,wood,x,1,z+(j-1.5)*.17,3,.1,.13,ry);}for(const s of [-1,1])box(x+s*1.1,.55,z,.1,1,.6,iron,ry);box(x,1.65,z-.35,3,.6,.1,wood,ry);}
function cafe(){for(let i=0;i<7;i++){const x=29+(i%2)*5,z=-20+Math.floor(i/2)*9;umbrella(x,z,2.1,'#dcd4bd');cylinder(x,1.05,z,.85,.85,.09,material('#c5b89a'),20);pole([x,0,z],[x,1,z],.055,mDark);for(let j=0;j<3;j++){const a=j*Math.PI*2/3,xx=x+Math.cos(a)*1.4,zz=z+Math.sin(a)*1.4;box(xx,.5,zz,.52,.1,.52,material('#8b7354'));box(xx,.85,zz-.25,.52,.65,.08,material('#8b7354'));}}}
function riverside(){const quay=material('#b3ac96',stone);box(-49,-3,0,12,2,340,quay);if(era==='heute'){box(-43,-1.6,-87,1.2,3.2,166,quay);box(-43,-1.6,96,1.2,3.2,148,quay);}else box(-43,-1.6,0,1.2,3.2,340,quay);const land=mesh(new THREE.PlaneGeometry(220,360),material('#e9e7dc',cobble),67,-.025,0);land.rotation.x=-Math.PI/2;
 if(era==='heute'){for(let i=0;i<13;i++)box(-43-i*.52,-i*.14-.13,8,1,.26,25,quay);for(let z=-130;z<140;z+=15){if(z>0&&z<28)continue;lamp(-39,z,true);}for(let z=-115;z<140;z+=19){if(z>-40&&z<60)continue;tree(-35,z,3.4);}bench(-35,40,Math.PI/2);bench(-35,-48,Math.PI/2);}
 else {for(let z=-135;z<145;z+=7.2){pole([-43,0,z],[-43,1.1,z],.05,mDark);pole([-43,1.05,z],[-43,1.05,z+7.2],.025,mDark);}for(let z=-115;z<140;z+=22)lamp(-36,z);}
 // The opposite bank gives the Rhine depth without pretending to a surveyed city model.
 box(-390,-3,0,100,4,1300,material('#6f8072'));for(let z=-470;z<500;z+=15){const h=range(8,18);box(-363,h/2-1,z,range(10,17),h,range(10,16),material(['#a4ac9c','#c7c5b3','#aeb5a5'][Math.floor(rand()*3)]));roof(-363,h-1,z,14,17,4,mRoof);}
}
const waterMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},dark:{value:new THREE.Color('#638684')},light:{value:new THREE.Color('#b8c4b2')},eye:{value:camera.position}},vertexShader:'varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',fragmentShader:`varying vec3 wp;uniform float time;uniform vec3 dark,light,eye;void main(){vec2 p=wp.xz;float a=sin(p.x*1.1+p.y*.72+time*1.1);float b=sin(p.x*2.4-p.y*.81-time*.7);float c=sin(p.x*.14+p.y*.27+time*.3);float n=a*.35+b*.2+c*.45;vec3 v=normalize(eye-wp);float fres=pow(1.-max(v.y,0.),3.);vec3 col=mix(dark,light,.3+fres*.55+n*.12);float glint=pow(max(0.,sin(p.x*1.3+p.y*.44+time)),18.)*.12;col+=vec3(glint)*(1.-fres);gl_FragColor=vec4(col,1.);}`});const water=new THREE.Mesh(new THREE.PlaneGeometry(340,1600),waterMat);water.rotation.x=-Math.PI/2;water.position.set(-220,-2.3,0);scene.add(water);
function boat(x,z,old=false){const hull=material(old?'#4b5045':'#d0d4c8');box(x,-.6,z,8,2,36,hull);box(x,.9,z+10,6,2,8,material('#dfd7bd'));box(x,2.2,z+10,6.5,.3,8.5,mDark);cylinder(x,3.7,z+11,.5,.6,3,material('#464c44'),12);box(x,.5,z-8,6,.4,17,material('#797a65'));}
function bridge(){const modern=era==='heute';const z=-220,ma=material(modern?'#93aaa2':'#626f67');box(-180,11,z,300,1.6,11,ma);for(let i=0;i<3;i++){const x=-62-i*90;box(x,1,z,6,18,12,mStone);}if(modern){for(const x of [-75,-270]){pole([x,10,z-4],[x,45,z-4],.8,ma);for(let j=0;j<5;j++)pole([x,43,z-4],[x+(j-2)*21,11,z-4],.07,ma);}}else {for(const zz of [-5,5])for(let seg=0;seg<3;seg++){let prev;for(let j=0;j<=15;j++){const xx=-40-seg*95-j*95/15,yy=12+Math.sin(j/15*Math.PI)*13;const p=[xx,yy,z+zz];if(prev)pole(prev,p,.27,ma);pole([xx,11,z+zz],p,.13,ma);prev=p;}}}}
function buildWorld(){endEncounter();$('#meet').disabled=true;$('#npc-status').textContent='Passanten werden geladen …';npcGeneration++;if(npcSystem){npcSystem.dispose();npcSystem=null;}seed=1928;if(world){scene.remove(world);world.traverse(o=>{if(o.geometry&&![boxGeo,planeGeo].includes(o.geometry))o.geometry.dispose();});}world=new THREE.Group();scene.add(world);buckets=new Map();colliders=[];
 riverside();makeTower();historicalChurch();
 // The perimeter is an interpretative ensemble; individual house widths are not survey measurements.
 const colors=era==='heute'?['#e4d9c2','#cfbda2','#d8c7aa','#e2dccc','#cbb9a0','#c4c9ba']:['#c8b89d','#bcb098','#d8cdb5','#bdbba6','#cfb99a','#c0b7a1'];
 for(let i=0;i<10;i++){building(45,-65+i*11.8,10.6,14,range(13.5,19),colors[i%colors.length],{rotation:-Math.PI/2,atlas:i%6,decor:i%3===0?2:1,gabled:i%4===0,shop:i===5?(era==='heute'?'CAFÉ AM BURGPLATZ':'WEIN & HANDEL'):''});}
 for(let i=0;i<7;i++)building(-11+i*9.1,64,8.9,15,range(13,18),colors[(i+2)%colors.length],{rotation:Math.PI,atlas:(i+2)%6,decor:i%2,gabled:i===3,shop:i===5?'ALTSTADT':''});
 for(let i=0;i<5;i++)building(-18+i*9.5,-65,9.3,13,range(11,17),colors[i%colors.length],{atlas:(i+4)%6,decor:1,gabled:i%2===0});
 if(era==='1869')palace();if(era==='1908'){gallery();dussel();market();tram();for(const x of [19.7,22.3])box(x,.015,12,.08,.035,95,material('#62685b',null,{metalness:.65,roughness:.3}));pole([21,6.2,-52],[21,6.2,62],.017,mDark);}
 if(era==='heute'){cafe();presentLandmarks();}

 for(let i=0;i<5;i++)boat(-90-i*47,-150+i*75,era!=='heute');if(era!=='1869')bridge();
 for(const {geo,mat,items} of buckets.values()){const im=new THREE.InstancedMesh(geo,mat,items.length);items.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=geo!==planeGeo;im.receiveShadow=true;im.computeBoundingSphere();world.add(im);}
 makeLabels();if(blocked(camera.position.x,camera.position.z,1))resetCamera(false);if(game){game.rebuild(world);populateCrowd();}
}
function groundHeight(x,z){return era==='heute'&&x<-42.5&&z>-4.5&&z<20.5?-Math.min(1.75,Math.max(0,(-x-42.5)*.14/.52)):0;}
function blocked(x,z,margin=.5){const minX=era==='heute'&&z>-4&&z<20?-51:-40.5;if(x<minX||x>38||z<-57||z>54)return true;return colliders.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+margin:Math.abs(x-c.x)<c.w/2+margin&&Math.abs(z-c.z)<c.d/2+margin);}
function anglesFor(pos,target){const d=new V(...target).sub(new V(...pos));return {yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))};}
function resetCamera(smooth=true){endEncounter();clearNavigationInput();setFieldOfView(DEFAULT_FOV);$('.scene-title').classList.toggle('dim',touring);const pos=[13,1.72,25],target=[-13,9,-19];moveTo(pos,target,smooth);}
function clearSegment(a,b){const len=a.distanceTo(b),n=Math.ceil(len/.8);for(let i=1;i<n;i++){const p=a.clone().lerp(b,i/n);if(blocked(p.x,p.z,.7))return false;}return true;}
function walkingPath(from,to){if(clearSegment(from,to))return [from,to];const cell=2,minX=-39,minZ=-55,NX=39,NZ=55,grid=(v)=>[Math.max(0,Math.min(NX-1,Math.round((v.x-minX)/cell))),Math.max(0,Math.min(NZ-1,Math.round((v.z-minZ)/cell)))],point=(x,z)=>new V(minX+x*cell,1.72,minZ+z*cell),key=(x,z)=>z*NX+x,start=grid(from),goal=grid(to),open=[start],came=new Map(),cost=new Map([[key(...start),0]]),closed=new Set();let found=null;
 while(open.length){open.sort((a,b)=>(cost.get(key(...a))+Math.hypot(a[0]-goal[0],a[1]-goal[1]))-(cost.get(key(...b))+Math.hypot(b[0]-goal[0],b[1]-goal[1])));const cur=open.shift(),ck=key(...cur);if(closed.has(ck))continue;if(cur[0]===goal[0]&&cur[1]===goal[1]){found=cur;break;}closed.add(ck);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const nx=cur[0]+dx,nz=cur[1]+dz;if(nx<0||nx>=NX||nz<0||nz>=NZ)continue;const p=point(nx,nz),nk=key(nx,nz);if(closed.has(nk)||blocked(p.x,p.z,.8)||!clearSegment(point(...cur),p))continue;const c=cost.get(ck)+Math.hypot(dx,dz);if(c<(cost.get(nk)??Infinity)){cost.set(nk,c);came.set(nk,cur);open.push([nx,nz]);}}}
 if(!found)return [from,to];const path=[to];let cur=found;while(key(...cur)!==key(...start)){path.push(point(...cur));cur=came.get(key(...cur));if(!cur)break;}path.push(from);path.reverse();const simple=[from];let i=0;while(i<path.length-1){let j=path.length-1;while(j>i+1&&!clearSegment(path[i],path[j]))j--;simple.push(path[j]);i=j;}return simple;}
function moveTo(pos,target,smooth=true){const a=anglesFor(pos,target);if(!smooth||reduced){camera.position.set(...pos);camera.rotation.set(a.pitch,a.yaw,0,'YXZ');tween=null;return;}let yaw=a.yaw;while(yaw-camera.rotation.y>Math.PI)yaw-=Math.PI*2;while(yaw-camera.rotation.y<-Math.PI)yaw+=Math.PI*2;const points=walkingPath(camera.position.clone(),new V(...pos)),lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+points[i].distanceTo(points[i-1]));tween={points,lengths,total:lengths.at(-1),yaw0:camera.rotation.y,yaw1:yaw,pitch0:camera.rotation.x,pitch1:a.pitch,start:performance.now(),duration:Math.max(1800,Math.min(6500,lengths.at(-1)*125))};}
function makeLabels(){ $('#labels').innerHTML='';landmarks=[{name:'Schlossturm',p:[-13,30,-19],id:'tower',n:'01'},{name:'St. Lambertus',p:[7,72,-81],id:'church',n:'03'},{name:era==='1869'?'Das alte Schloss':era==='1908'?'Düsselschlösschen':'Rheinufer',p:era==='1869'?[-31,18,5]:era==='1908'?[-40,24,-23]:[-43,2,8],id:'river',n:'02'}];for(const l of landmarks){l.el=document.createElement('button');l.el.className='landmark';l.el.innerHTML=`<span>${l.n}</span>${l.name}`;l.el.addEventListener('click',()=>openLandmark(l.id));$('#labels').append(l.el);}}
function updateLabels(){camera.updateMatrixWorld(true);for(const l of landmarks){const p=new V(...l.p),dist=p.distanceTo(camera.position);p.project(camera);const visible=p.z<1&&p.x>-.93&&p.x<.93&&p.y>-.83&&p.y<.72&&dist>12;l.el.style.display=visible?'flex':'none';if(visible){l.el.style.left=(p.x*.5+.5)*innerWidth+'px';l.el.style.top=(-p.y*.5+.5)*innerHeight+'px';}}}
function setEra(next){if(next===era)return;clearNavigationInput();tween=null;era=next;updateEraCard();buildWorld();if(touring){stopIndex=0;visitStop(0);}toast(`${era==='heute'?'Gegenwart':era} · ${ERA[era].title}`);}
function updateEraCard(){const e=ERA[era];$('#play-year').textContent=era==='heute'?'Heute':era;$('#scene-year').textContent=era==='heute'?'Düsseldorf, heute.':`Düsseldorf, ${era}.`;$('#evidence-label').textContent=ERA_EVIDENCE[era].label;$('#evidence-label').title=ERA_EVIDENCE[era].caution;$('#era-kicker').textContent=e.kicker;$('#era-title').textContent=e.title;$('#era-copy').textContent=e.copy;$('#archive-thumb').src='assets/'+e.image+'.jpg';$('#archive-thumb').alt=e.sub+' des Burgplatzes';$('#archive-sub').textContent=e.sub;$$('[data-era]').forEach(b=>{const a=b.dataset.era===era;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a);});}

const stops=()=>[
 {title:'Der Turm, der blieb',pos:[8,1.72,5],target:[-13,12,-19],copy:era==='1869'?'Der Schlossturm ist noch Teil eines größeren Gebäudekomplexes. Seine obere Laterne stammt aus dem Wiederaufbau unter preußischer Herrschaft.':era==='1908'?'Nach dem Brand von 1872 blieb der runde Turm erhalten. Auf der Postkarte von 1908 ist seine filigrane obere Bekrönung gut zu erkennen. Im Modell unterscheidet sie sich deshalb vom heutigen Dach.':'Im erhaltenen Schlossturm ist seit 1984 das SchifffahrtMuseum zu Hause. Die runde untere Form und die achteckige Laterne erzählen von unterschiedlichen Bauphasen.'},
 {title:era==='1869'?'Ein Schloss im Alltag':era==='1908'?'Das verschwundene Schlösschen':'Die Stadt findet den Fluss',pos:era==='1869'?[1,1.72,13]:[-29,1.72,7],target:era==='1869'?[-36,9,3]:era==='1908'?[-40,8,-23]:[-120,0,-30],copy:era==='1869'?'Das alte Residenzschloss dient im 19. Jahrhundert unter anderem der Kunstakademie und dem Provinziallandtag. Die Aufnahme von 1869 zeigt, wie unterschiedlich seine Gebäudeteile inzwischen aussehen.':era==='1908'?'Johannes Radkes Düsselschlösschen prägt seit 1902 das neue Rheinufer. Seine verspielte Architektur ist in einer historischen Entwurfszeichnung überliefert. Das Gebäude existiert heute nicht mehr.':'Die Rheinuferpromenade wurde 1995 fertiggestellt. Die Freitreppe macht aus dem Rand der Altstadt einen Aufenthaltsort direkt am Wasser.'},
 {title:'Ein zweites Wahrzeichen',pos:[11,1.72,-35],target:[7,35,-81],copy:'Hinter dem Schlossturm ragt St. Lambertus auf. Die Kirche bildet bis heute einen festen Punkt in der Silhouette der Altstadt. Ihre markante, gedrehte Turmspitze ist im Modell vereinfacht nachgebildet.'},
 {title:'Derselbe Ort. Eine andere Zeit.',pos:[24,1.72,23],target:[-13,9,-19],copy:'Wechsle jetzt unten die Zeitebene. Der Standort bleibt bei freier Erkundung erhalten, solange er nicht in einem historischen Gebäude liegt. So wird sichtbar, was verschwunden ist und was den Burgplatz bis heute zusammenhält.'}
];
function visitStop(i){clearNavigationInput();setFieldOfView(DEFAULT_FOV);stopIndex=(i+4)%4;const s=stops()[stopIndex];moveTo(s.pos,s.target);$('#stop-count').textContent=String(stopIndex+1).padStart(2,'0')+' / 04';$('#stop-title').textContent=s.title;$('#era-kicker').textContent=`STATION ${stopIndex+1} · ${era==='heute'?'HEUTE':era}`;$('#era-title').textContent=s.title;$('#era-copy').textContent=s.copy;$('#story-card').classList.remove('collapsed');$('#toggle-story').textContent='−';$('#toggle-story').setAttribute('aria-label','Infokarte einklappen');}
function startTour(){endEncounter();touring=!touring;$('#tour-text').textContent=touring?'Rundgang beenden':'Rundgang starten';$('#tour-icon').textContent=touring?'■':'▷';$('#tour-status').hidden=!touring;$('#walk-hint').hidden=touring;$('#mode-label').textContent=touring?'Geführter Rundgang':'Freier Rundgang';$('.scene-title').classList.toggle('dim',touring);if(touring){visitStop(0);$('#story-card').classList.remove('collapsed');$('#toggle-story').textContent='−';$('#toggle-story').setAttribute('aria-label','Infokarte einklappen');}else{updateEraCard();tween=null;$('#story-card').classList.add('collapsed');$('#toggle-story').textContent='+';$('#toggle-story').setAttribute('aria-label','Infokarte ausklappen');}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3300);}
function showModal(title,content){if(document.pointerLockElement)document.exitPointerLock();$('#modal-kicker').textContent=title;$('#modal-content').innerHTML=content;$('#modal').showModal();clearNavigationInput();}
function archive(){const e=ERA[era];showModal('BURGPLATZ · BILDARCHIV',`<h2>${e.sub}</h2><p>Die historische Vorlage bleibt sichtbar. Vergleiche Silhouette, Gebäude und Platzleben mit der 3D-Ansicht.</p><figure><a href="assets/${e.image}.jpg" target="_blank"><img src="assets/${e.image}.jpg" alt="${e.sub}: Burgplatz Düsseldorf"></a><figcaption>${e.caption} <a href="${e.url}" target="_blank" rel="noopener">Bildnachweis ↗</a>${era==='heute'?' · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">Lizenz</a>':''}</figcaption></figure>${era==='1908'?'<p>Die Postkarte zeigt links das Galeriegebäude, in der Mitte den Turm, dahinter das Düsselschlösschen und rechts die Häuserzeile. Markt und Straßenbahn sind belegt. Farben und genaue Maße im Modell sind Annäherungen.</p>':''}`);}
function sources(){showModal('HINTER DER ZEITREISE',`<h2>Quellen. Spuren. Spielräume.</h2><p>Diese Tour ist eine begehbare, interpretative Rekonstruktion. Historische Bilder geben die wichtigsten Baukörper und Veränderungen vor. Sie ersetzen keine vollständigen Bauaufmaße.</p><div class="method-note"><strong>Was ist belegt?</strong> Schloss und Nutzung vor 1872, der erhaltene Schlossturm, das Düsselschlösschen, Markt und Straßenbahn um 1908 sowie die Umgestaltung der Promenade bis 1995.<br><strong>Was ist angenähert?</strong> Gebäudeabstände und Höhen, kleinere Fassaden, verdeckte Rückseiten, Farben, Vegetation, Menschen, Schiffe und die Brückendarstellung. Die Gegenwart zeigt einen vereinfachten dauerhaften Zustand ohne wechselnde Veranstaltungen. Das Modell ist weder vermessungsgenau noch fotogrammetrisch erstellt.</div><h3>Belegte Bauformen</h3><p>Am Schlossturm sind die paarigen Rundbogenfenster und schmalen Schaftöffnungen nach der Postkarte korrigiert. St. Lambertus besitzt einen Westturm mit Tuffverblendung und drei parallele Dächer. Die Ausrichtung ist korrigiert, die Position im Modell bleibt geschätzt. <a href="https://www.baukunst-nrw.de/index.php/objekte/2236-st-lambertus-duesseldorf" target="_blank" rel="noopener">Architekturbeschreibung St. Lambertus</a>.</p><p>Die Kunstgewerbeschule am Burgplatz 1 ist seit 1883 belegt. Ihre genaue historische Einordnung in die Gebäudefront ist noch nicht vermessen. Die Fassung von 1869 bleibt deshalb ausdrücklich eine Annäherung. <a href="https://www.duesseldorf.de/denkmalschutz/qr-codes/denkmal-burgplatz" target="_blank" rel="noopener">Denkmalschutz Düsseldorf</a>.</p><h3>Historische Bilder</h3><div class="archive-grid"><figure><img src="assets/1869.jpg" alt="Altes Schloss 1869"><figcaption>${ERA['1869'].caption} <a href="${ERA['1869'].url}" target="_blank" rel="noopener">Original ↗</a></figcaption></figure><figure><img src="assets/1908.jpg" alt="Postkarte 1908"><figcaption>${ERA['1908'].caption} <a href="${ERA['1908'].url}" target="_blank" rel="noopener">Original ↗</a></figcaption></figure><figure><img src="assets/radke.jpg" alt="Entwurf des Düsselschlösschens"><figcaption>Düsselschlösschen, Entwurf Baurat Radke, 1902. Aus „Düsseldorf und seine Bauten“. Gemeinfrei. <a href="https://commons.wikimedia.org/wiki/File:D%C3%BCsselschl%C3%B6%C3%9Fchen_in_D%C3%BCsseldorf,_Entwurf_Baurat_Radke,_1902,_Zeichnung.jpg" target="_blank" rel="noopener">Original ↗</a></figcaption></figure><figure><img src="assets/plan.jpg" alt="Historischer Grundriss des alten Schlosses"><figcaption>Historischer Schlossgrundriss, nach Clemen, „Kunstdenkmäler der Rheinprovinz“. Gemeinfrei. Über Wikimedia Commons. Der Plan zeigt einen älteren Bauzustand und dient nur zur Orientierung der Schlossanlage.</figcaption></figure></div><h3>Gegenwartsvergleich</h3><figure><img src="assets/heute.jpg" alt="Schlossturm 2025"><figcaption>${ERA.heute.caption} <a href="${ERA.heute.url}" target="_blank" rel="noopener">Quelle</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a></figcaption></figure><h3>Zum Weiterlesen</h3><p><a href="https://www.schifffahrtmuseum.de/museum/geschichte-schloss" target="_blank" rel="noopener">SchifffahrtMuseum: Geschichte des Schlosses ↗</a><br><a href="https://www.duesseldorf.de/amt-fuer-bruecken-tunnel-und-stadtbahnbau/tunnel/rheinufertunnel" target="_blank" rel="noopener">Landeshauptstadt Düsseldorf: Rheinufertunnel und Promenade ↗</a><br><a href="https://www.duesseldorf.de/medienportal/pressedienst-einzelansicht/pld/die-geschichte-der-rheinuferpromenade-kabinett-ausstellung-im-schifffahrtmuseum" target="_blank" rel="noopener">SchifffahrtMuseum / Stadtarchiv: Geschichte der Rheinuferpromenade ↗</a></p><h3>Weitere Orientierungspunkte</h3><p>Radschlägerbrunnen und Kuhna-Mauer sind in der Gegenwart vereinfacht angedeutet. Brunnenplastik und Farbmuster sind keine originalgetreuen Detailmodelle. <a href="https://www.visitduesseldorf.de/attraktionen/radschlaegerbrunnen-8044995542" target="_blank" rel="noopener">Düsseldorf Tourismus: Radschlägerbrunnen</a> · <a href="https://kuhna-stiftung.org/index.php/kuhna-mauer/" target="_blank" rel="noopener">Kuhna-Stiftung: Rivertime</a>.</p><h3>Menschen und Kleidung</h3><p>Sechs historische beziehungsweise acht heutige Passanten verwenden drei unterschiedliche, vollständig dreidimensionale Figuren mit eigener Skelettanimation. Die drei Gesichter sind fiktiv. Die CC0-Modelle <a href="https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-jordan-3d-person-animated-c805c97a" target="_blank" rel="noopener">Jordan</a>, <a href="https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-harper-3d-person-animated-e6e9eb6a" target="_blank" rel="noopener">Harper</a> und <a href="https://www.innerscene.com/tools/library/3d-parts/relaxed-walk-sam-3d-person-animated-732f1206" target="_blank" rel="noopener">Sam</a> stammen von Innerscene / MakeHuman. Anzüge und Stoffkleidung dienen als Annäherung. Filzhüte und Schirmmützen sind an die jeweilige Kopfkontur angepasst. Koteletten und Schnurrbärte greifen historische Bartmoden auf. Vorbilder für die historische Gestaltung sind die Burgplatz-Postkarte von 1908 und das <a href="https://www.deutsche-digitale-bibliothek.de/item/T44GQY6MT2SWOOXUXIEAJIKV5E6HPGHQ" target="_blank" rel="noopener">Porträt von Laurenz Heinrich Hetjens aus dem Jahr 1865</a> aus dem Hetjens-Museum. Schnitt, Schuhe und Accessoires sind keine exakten Rekonstruktionen von 1869 oder 1908. Die Ebene 1869 verwendet nur Melonen, keine später verbreiteten Homburg-Hüte. Zur Einordnung: <a href="https://www.ttumuseumcollections.org/exhibit_item/bowler-hat/" target="_blank" rel="noopener">Museum of Texas Tech University</a> und <a href="https://www.bad-homburg.de/de/stadt/aktuelles/vortrag-zur-entstehungsgeschichte-des-homburg-hutes-y65gxg0ykk" target="_blank" rel="noopener">Stadtarchiv Bad Homburg</a>.</p><h3>Oberflächen und Bildrekonstruktion</h3><p> Die sechs Bildtexturen der Wohnhäuser wurden mit KI anhand des historischen Fassadencharakters entworfen. Sie sind plausible Ergänzungen und keine originalgetreuen Fotografien einzelner Burgplatz-Häuser. Stein-, Putz-, Pflaster- und Dachmaterialien sowie das Umgebungslicht stammen aus fotografisch erfassten CC0-Assets von <a href="https://polyhaven.com" target="_blank" rel="noopener">Poly Haven</a>. Verwendet: cobblestone_floor_02, painted_plaster_wall, large_sandstone_blocks, grey_roof_tiles, brick_wall_04, wooden_rough_planks und kloofendal_43d_clear_puresky. Diese Materialien belegen keinen historischen Bauzustand.</p><h3>Technik</h3><p>Die Szene wird lokal im Browser gerendert. Keine Anmeldung innerhalb der Tour, kein Tracking durch die Anwendung. Atmosphäre: synthetisch erzeugtes Wasserrauschen. Spielengine: Babylon.js, Apache-2.0. Geometrieaufbau: Three.js, MIT-Lizenz. Schrift: DM Sans, Google Fonts. Quellenstand: November 2026.</p>`);}
function help() {
 showModal('DEIN SPAZIERGANG', `<h2>Gehen und umsehen</h2>
 <div class="help-keys">
  <b>Tastatur</b><span>Mit WASD gehen, mit den Pfeiltasten nach links, rechts, oben und unten schauen. Umschalt beschleunigt das Gehen.</span>
  <b>Maus oder Touch</b><span>Zum Umsehen direkt im Bild ziehen. Die Richtungstasten neben der Karte anklicken oder zum Weitergehen gedrückt halten.</span>
  <b>Zoom</b><span>Mit Mausrad, + und − oder den Zoomtasten neben der Karte den Bildausschnitt ändern.</span>
  <b>Blick gerade · R</b><span>Mit ⊙ oder R den Blick auf den Horizont richten und den Zoom zurücksetzen. Du bleibst am selben Ort.</span>
  <b>Startpunkt · H</b><span>Mit ⌖ auf der Karte oder H zum Ausgangspunkt zurückkehren.</span>
  <b>1869 · 1908 · Heute</b><span>Über die Zeitleiste wechselst du die Epoche. Im geführten Rundgang führen die Pfeile oberhalb der Zeitleiste zur nächsten Station.</span>
  <b>Mausblick</b><span>Optionaler Spielmodus. Die Maus steuert den Blick und WASD die Bewegung. Mit einem Klick oder Esc kehrst du zur Oberfläche zurück.</span>
  <b>♪ / ☀ / ⛶</b><span>Wasserrauschen, Abendlicht und Vollbild.</span>
 </div>
 <div class="help-actions">
  <button class="primary-button" id="help-start">Zurück zum Platz</button>
  <button class="primary-button" id="help-mouse-look">Mausblick starten</button>
 </div>`);
 $('#help-start').onclick=()=>$('#modal').close();
 $('#help-mouse-look').onclick=startMouseLook;
}
function openLandmark(id){if(id==='tower')showModal('01 · DER SCHLOSSTURM',`<h2>Was vom Schloss blieb.</h2><p>Der Turm ist das letzte oberirdisch erhaltene Gebäude des früheren Residenzschlosses. Nach Zerstörungen wurde er mehrfach verändert. Unter preußischer Herrschaft erhielt er das zusätzliche Aussichtsgeschoss, die sogenannte Laterne.</p><p>Nach dem Brand von 1872 verschwanden die Schlossflügel schrittweise. Der Turm blieb als Wahrzeichen. Seit 1984 ist er mit dem SchifffahrtMuseum verbunden.</p><p>Die Tour zeigt für 1908 eine vereinfachte offene Bekrönung nach der Postkarte. Die heutige Dachform ist gesondert modelliert.</p><a href="https://www.schifffahrtmuseum.de/museum/geschichte-schloss" target="_blank" rel="noopener">Geschichte beim SchifffahrtMuseum ↗</a>`);else if(id==='church')showModal('03 · ST. LAMBERTUS',`<h2>Ein Fixpunkt über den Dächern.</h2><p>Die Basilika St. Lambertus gehört gemeinsam mit dem Schlossturm zu den prägenden Bauwerken der Altstadtsilhouette. Ihre charakteristische Turmspitze hilft bei der Orientierung.</p><p>In dieser Szene ist die Kirche als vereinfachter Baukörper angelegt. Details der Fassade und die exakte Verdrehung des Turmhelms sind Annäherungen.</p>`);else if(era==='1908')showModal('02 · DAS DÜSSELSCHLÖSSCHEN',`<h2>Ein kleines Schloss am Wasser.</h2><p>Das von Stadtbaurat Johannes Radke entworfene Düsselschlösschen entstand 1902 am umgestalteten Rheinufer. Es war ein Weinlokal, keine Fortsetzung der herzoglichen Schlossanlage.</p><figure><img src="assets/radke.jpg" alt="Historischer Architekturentwurf des Düsselschlösschens"><figcaption>Entwurf Radke, 1902. „Düsseldorf und seine Bauten“, via Wikimedia Commons. Gemeinfrei.</figcaption></figure><p>Türmchen, Giebel und die Lage nahe dem Schlossturm sind anhand der historischen Ansichten angenähert.</p>`);else archive();}

const map=$('#map'),ctx=map.getContext('2d');function drawMap(){const W=map.width,H=map.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#e8e6d8';ctx.fillRect(0,0,W,H);const tr=(x,z)=>[W*.48+x*2,H*.43+z*1.65];ctx.fillStyle='#a8c2bb';ctx.fillRect(0,0,89,H);ctx.fillStyle='#c6c5b6';const rect=(x,z,w,d)=>{const p=tr(x-w/2,z-d/2);ctx.fillRect(p[0],p[1],w*2,d*1.65);};rect(47,-8,15,128);rect(15,64,90,15);rect(12,-65,68,14);ctx.fillStyle='#a6aa96';rect(29,-81,37,20);rect(7,-81,10,10);if(era==='1869'){rect(-31,-20,26,12);rect(-38,5,12,39);rect(-15,29,37,12);}if(era==='1908'){rect(-10,38,40,12);rect(-40,-23,9,11);}const t=tr(-13,-19);ctx.fillStyle='#92896a';ctx.beginPath();ctx.arc(...t,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7c9387';ctx.font='13px sans-serif';ctx.save();ctx.translate(27,H*.65);ctx.rotate(-Math.PI/2);ctx.fillText('R H E I N',0,0);ctx.restore();ctx.fillStyle='#5c7366';ctx.font='14px sans-serif';ctx.fillText('N',W-25,25);ctx.beginPath();ctx.moveTo(W-21,35);ctx.lineTo(W-21,52);ctx.strokeStyle='#5c7366';ctx.stroke();const p=tr(camera.position.x,camera.position.z);ctx.save();ctx.translate(...p);ctx.rotate(-camera.rotation.y);ctx.fillStyle='#a78847';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(-11,0);ctx.lineTo(11,0);ctx.closePath();ctx.globalAlpha=.22;ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#244b3d';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
function changeLight(){evening=!evening;game?.setEvening(evening);$('#light').textContent=evening?'☾':'☀';$('#light').setAttribute('aria-label',evening?'Tageslicht einschalten':'Abendlicht einschalten');$('#light').classList.toggle('on',evening);toast(evening?'Warmes Abendlicht':'Helles Tageslicht');}
async function populateCrowd(){const generation=npcGeneration;try{const {createNPCSystem}=await import('./npc-system.js?v=6');const system=await createNPCSystem(game,{era,isWalkable:(x,z)=>!blocked(x,z,.9),onProgress:message=>{if(generation===npcGeneration&&$('#loading p'))$('#loading p').textContent=message;}});if(generation!==npcGeneration){system.dispose();return;}npcSystem=system;initialContentReady=true;const status=$('#npc-status');if(status)status.textContent=`${system.count??0} 3D-Figuren · ${system.distinctFaces} Gesichter`;$('#meet').disabled=!system.count;return system;}catch(error){console.error('NPC setup failed',error);const status=$('#npc-status');if(generation===npcGeneration){initialContentReady=true;if(status)status.textContent='Figuren nicht geladen';}}}
let audioCtx,gain,audioOn=false;async function sound(){try{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();const len=audioCtx.sampleRate*4,buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),data=buf.getChannelData(0);let brown=0;for(let i=0;i<len;i++){brown=(brown+(.02*(Math.random()*2-1)))/1.02;data[i]=brown*3.5;}const src=audioCtx.createBufferSource();src.buffer=buf;src.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;gain=audioCtx.createGain();gain.gain.value=0;src.connect(filter).connect(gain).connect(audioCtx.destination);src.start();}await audioCtx.resume();audioOn=!audioOn;gain.gain.setTargetAtTime(audioOn?.35:0,audioCtx.currentTime,.6);$('#sound').classList.toggle('on',audioOn);$('#sound').setAttribute('aria-label',audioOn?'Atmosphäre ausschalten':'Atmosphäre einschalten');toast(audioOn?'Wasserrauschen eingeschaltet':'Atmosphäre ausgeschaltet');}catch{toast('Ton ist in diesem Browser nicht verfügbar.');}}

$$('[data-era]').forEach(b=>b.addEventListener('click',()=>setEra(b.dataset.era)));$('#tour').onclick=startTour;$('#next-stop').onclick=()=>visitStop(stopIndex+1);$('#prev-stop').onclick=()=>visitStop(stopIndex-1);$('#archive-btn').onclick=archive;$('#sources-btn').onclick=sources;$('#method-btn').onclick=sources;$('#help').onclick=help;$('#close-modal').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});$('#home').onclick=()=>resetCamera();$('#light').onclick=changeLight;$('#sound').onclick=sound;$('#fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('Vollbild ist hier nicht verfügbar. Öffne die Tour in einem eigenen Browserfenster.');}};$('#toggle-story').onclick=()=>{const c=$('#story-card').classList.toggle('collapsed');$('#toggle-story').textContent=c?'+':'−';$('#toggle-story').setAttribute('aria-label',c?'Infokarte ausklappen':'Infokarte einklappen');};
function endEncounter(){if(!encounter)return;camera.position.copy(encounter.position);camera.quaternion.copy(encounter.quaternion);setFieldOfView(encounter.fov);encounter=null;npcSystem?.setPaused(false);$('#encounter-panel').hidden=true;$('#experience').classList.remove('encounter');clearNavigationInput();}
function meetPerson(){if(!npcSystem?.count)return;if(!encounter){encounter={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,index:-1};setFieldOfView(48);npcSystem.setPaused(true);tween=null;clearNavigationInput();}const people=npcSystem.getCharacters(),unique=people.filter((p,i)=>people.findIndex(q=>q.model===p.model)===i);encounter.index=(encounter.index+1)%unique.length;const person=unique[encounter.index],p=person.position;let angle=person.rotationY;for(let i=0;i<12;i++){const a=person.rotationY+i*Math.PI/6;if(!blocked(p[0]+Math.sin(a)*1.5,p[2]+Math.cos(a)*1.5,.25)){angle=a;break;}}camera.position.set(p[0]+Math.sin(angle)*1.5,1.62,p[2]+Math.cos(angle)*1.5);camera.lookAt(p[0],person.height*.86,p[2]);$('#encounter-note').textContent=`Porträt ${encounter.index+1} von ${unique.length} · Fiktive Person${era==='heute'?'':', Garderobe angenähert'}.`;$('#encounter-panel').hidden=false;$('#experience').classList.add('encounter');}
$('#meet').onclick=meetPerson;$('#encounter-next').onclick=meetPerson;$('#encounter-close').onclick=endEncounter;
const vp = $('#viewport');
const pressedKeys = new Set();
const movePointers = new Map();
const movementKeys = {w:'forward', s:'back', a:'left', d:'right'};
const lookKeys = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'];
let lookDrag = null;

function clearNavigationInput() {
 pressedKeys.clear();
 movePointers.clear();
 lookDrag = null;
 vp.classList.remove('dragging');
}

function setFieldOfView(value) {
 camera.fov = THREE.MathUtils.clamp(value, 35, 85);
 camera.updateProjectionMatrix();
}

function canNavigate() {
 return !encounter && !$('#modal').open;
}

function zoomView(amount) {
 if (canNavigate()) setFieldOfView(camera.fov + amount);
}

function levelView() {
 if (!canNavigate()) return;
 tween = null;
 camera.rotation.x = 0;
 setFieldOfView(DEFAULT_FOV);
}

function turnView(yaw, pitch) {
 if (!yaw && !pitch) return;
 tween = null;
 const angle = camera.rotation.y + yaw;
 camera.rotation.y = Math.atan2(Math.sin(angle), Math.cos(angle));
 camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + pitch, -1.32, 1.32);
}

function walk(forward, sideways, dt, pace = 3.2) {
 const length = Math.hypot(forward, sideways);
 if (!length) return;
 tween = null;
 const yaw = camera.rotation.y;
 const distance = pace * dt / length;
 const x = camera.position.x + (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * distance;
 const z = camera.position.z + (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * distance;
 if (!blocked(x, camera.position.z)) camera.position.x = x;
 if (!blocked(camera.position.x, z)) camera.position.z = z;
 camera.position.y = groundHeight(camera.position.x, camera.position.z) + 1.72;
}

function updateManualNavigation(dt) {
 if (!canNavigate() || (!pressedKeys.size && !movePointers.size)) return;
 const key = name => Number(pressedKeys.has(name));
 turnView(
  (key('arrowleft') - key('arrowright')) * 1.55 * dt,
  (key('arrowup') - key('arrowdown')) * 1.15 * dt
 );
 const moves = new Set(movePointers.values());
 for (const [keyName, direction] of Object.entries(movementKeys)) {
  if (pressedKeys.has(keyName)) moves.add(direction);
 }
 walk(Number(moves.has('forward')) - Number(moves.has('back')),
  Number(moves.has('right')) - Number(moves.has('left')),
  dt, pressedKeys.has('shift') ? 6 : 3.2);
}

$('#walk').onclick=()=>{
 vp.focus({preventScroll:true});
 toast('WASD oder Steuerkreuz zum Gehen · Pfeiltasten oder Ziehen zum Umsehen');
};
$('#zoom-in').onclick=()=>zoomView(-5);
$('#zoom-out').onclick=()=>zoomView(5);
$('#level-view').onclick=levelView;

function showMouseLookFallback() {
 toast('Mausblick ist hier nicht verfügbar. Ziehen und die Pfeiltasten funktionieren weiterhin.');
}

async function startMouseLook() {
 $('#modal').close();
 try {
  await gameCanvas.requestPointerLock();
 } catch {
  showMouseLookFallback();
 }
}

document.addEventListener('pointerlockerror', showMouseLookFallback);
document.addEventListener('pointerlockchange', ()=>{
 const active = document.pointerLockElement === gameCanvas;
 clearNavigationInput();
 $('#experience').classList.toggle('playing', active);
 $('#play-hud').hidden = !active;
});
document.addEventListener('mousemove', event=>{
 if (document.pointerLockElement === gameCanvas && canNavigate()) {
  turnView(-event.movementX * .002, -event.movementY * .002);
 }
});

vp.addEventListener('pointerdown', event=>{
 if (document.pointerLockElement === gameCanvas) {
  document.exitPointerLock();
  return;
 }
 if (!canNavigate() || event.button !== 0 || lookDrag) return;
 lookDrag = {id:event.pointerId, x:event.clientX, y:event.clientY};
 vp.setPointerCapture(event.pointerId);
 vp.classList.add('dragging');
 vp.focus({preventScroll:true});
});
vp.addEventListener('pointermove', event=>{
 if (!lookDrag || lookDrag.id !== event.pointerId || !canNavigate()) return;
 turnView((lookDrag.x - event.clientX) * .0035, (lookDrag.y - event.clientY) * .003);
 lookDrag.x = event.clientX;
 lookDrag.y = event.clientY;
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
 vp.addEventListener(type, event=>{
  if (lookDrag?.id !== event.pointerId) return;
  lookDrag = null;
  vp.classList.remove('dragging');
 });
}
vp.addEventListener('wheel', event=>{
 if (!canNavigate() || event.ctrlKey || event.metaKey || !event.deltaY) return;
 event.preventDefault();
 const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
 zoomView(THREE.MathUtils.clamp(event.deltaY * scale * .04, -6, 6));
}, {passive:false});

addEventListener('keydown', event=>{
 if ($('#modal').open || event.ctrlKey || event.metaKey || event.altKey ||
  event.target?.closest?.('input, textarea, select, [contenteditable]')) return;
 const key = event.key.toLowerCase();
 if (key === 'escape') endEncounter();
 if (key === 'h' && !event.repeat) {
  resetCamera();
  return;
 }
 if (!canNavigate()) return;
 if (key === 'r') levelView();
 else if (key === '+' || key === '=') zoomView(-4);
 else if (key === '-' || key === '−') zoomView(4);
 else if (Object.hasOwn(movementKeys, key) || lookKeys.includes(key)) {
  if (lookKeys.includes(key) && event.target?.closest?.('#story-card:not(.collapsed)')) return;
  pressedKeys.add(key);
 } else {
  if (key === 'shift') pressedKeys.add(key);
  return;
 }
 event.preventDefault();
});
addEventListener('keyup', event=>pressedKeys.delete(event.key.toLowerCase()));
addEventListener('blur', clearNavigationInput);
document.addEventListener('visibilitychange', ()=>{
 clearNavigationInput();
 if (document.hidden && audioCtx) audioCtx.suspend();
 else if (audioCtx && audioOn) audioCtx.resume();
});

for (const button of $$('[data-move]')) {
 const direction = button.dataset.move;
 const nudge = ()=>{
  if (!canNavigate()) return;
  walk(Number(direction === 'forward') - Number(direction === 'back'),
   Number(direction === 'right') - Number(direction === 'left'), .075);
 };
 button.addEventListener('pointerdown', event=>{
  if (!canNavigate() || event.button !== 0) return;
  event.preventDefault();
  button.setPointerCapture(event.pointerId);
  movePointers.set(event.pointerId, direction);
  nudge();
 });
 for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  button.addEventListener(type, event=>movePointers.delete(event.pointerId));
 }
 button.addEventListener('click', event=>{if (event.detail === 0) nudge();});
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();game?.resize(innerWidth,innerHeight);});
$('#story-card').classList.add('collapsed');$('#toggle-story').textContent='+';$('#toggle-story').setAttribute('aria-label','Infokarte ausklappen');
$('#clean-view').onclick=()=>{const clean=$('#experience').classList.toggle('clean-view');$('#clean-view').setAttribute('aria-pressed',clean);$('#clean-view').textContent=clean?'↩':'◉';};
game=await createGameEngine({canvas:gameCanvas,camera,assetsBase:'./assets/',onProgress:message=>{if($('#loading p'))$('#loading p').textContent=message;}});
resetCamera(false);updateEraCard();buildWorld();

let frame=0;function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;updateManualNavigation(dt);if(tween){let t=Math.min((performance.now()-tween.start)/tween.duration,1),e=t*t*(3-2*t),d=e*tween.total,i=1;while(i<tween.lengths.length-1&&tween.lengths[i]<d)i++;const segment=tween.lengths[i]-tween.lengths[i-1],u=segment>0?(d-tween.lengths[i-1])/segment:1;camera.position.lerpVectors(tween.points[i-1],tween.points[i],u);camera.rotation.y=THREE.MathUtils.lerp(tween.yaw0,tween.yaw1,e);camera.rotation.x=THREE.MathUtils.lerp(tween.pitch0,tween.pitch1,e);if(t===1)tween=null;}

 npcSystem?.update(dt,time,camera);if(frame++%3===0){updateLabels();drawMap();}game.render(dt,time,camera);
 if(frame>3&&initialContentReady&&$('#loading')&&!$('#loading').classList.contains('done')){$('#loading').classList.add('done');setTimeout(()=>$('#loading')?.remove(),900);}}
animate();
// Read-only diagnostics for verification; no user data is collected.
window.burgplatz={getState:()=>({era,touring,stopIndex,evening,audioOn,position:camera.position.toArray(),engine:'Babylon.js',npcs:npcSystem?.count??0,colliders:colliders.length}),setEra};
