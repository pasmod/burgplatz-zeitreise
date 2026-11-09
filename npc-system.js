/** Genuine skinned glTF actors with independent skeletons and walk animations. */
export const NPC_CATALOG = Object.freeze([
 {id:'sam',url:'assets/npc/sam-relaxed-walk.glb',height:1.76,animationName:'Walk_Relaxed',walkSpeed:1.3,source:'https://www.innerscene.com/tools/library/3d-parts/relaxed-walk-sam-3d-person-animated-732f1206',license:'CC0-1.0',wardrobe:'Langärmeliges Oberteil und Stoffhose als historische Annäherung.'},
 {id:'jordan',url:'assets/npc/jordan-business-walk.glb',height:1.79,animationName:'Walk_Carry',walkSpeed:1.2,source:'https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-jordan-3d-person-animated-c805c97a',license:'CC0-1.0',wardrobe:'Klassischer Anzug; historische Ergänzungen sind angenähert.'},
 {id:'harper',url:'assets/npc/harper-business-walk.glb',height:1.71,animationName:'Walk_Carry',walkSpeed:1.2,source:'https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-harper-3d-person-animated-e6e9eb6a',license:'CC0-1.0',wardrobe:'Zeitgenössische Basisfigur; für historische Ebenen ergänzte Garderobe.'}
]);

export async function createNPCSystem(game,{era='1908',isWalkable=()=>true,onProgress=()=>{}}={}){
 const actors=[];let disposed=false,paused=false;
 const seeds=[[6,15],[20,10],[-4,3],[-27,13],[12,-16],[29,29],[-30,-39],[27,-36]];
 const number=era==='heute'?8:6;
 const historical = era !== 'heute';
 const [wardrobe, grooming] = historical ? await Promise.all([
  import('./npc-wardrobe.js?v=2').catch(()=>null),
  import('./npc-grooming.js').catch(()=>null),
 ]) : [null, null];
 const headwear = era === '1869' ? ['bowler','bowler','none','bowler','none','bowler'] :
  ['flatcap','homburg','none','bowler','none','flatcap'];
 const fabrics = ['#8c7965','#a9a69a','#b6a697','#8e9581','#aeaa9d','#9a8776'];
 let serial=0;
 function random(actor){actor.seed=(1664525*actor.seed+1013904223)>>>0;return actor.seed/4294967296;}
 function clearLine(x,z,xx,zz){const n=Math.max(1,Math.ceil(Math.hypot(xx-x,zz-z)/.7));for(let i=1;i<=n;i++)if(!isWalkable(x+(xx-x)*i/n,z+(zz-z)*i/n))return false;return true;}
 function chooseTarget(actor){const p=actor.npc.root.position;for(let i=0;i<45;i++){const a=random(actor)*Math.PI*2,d=5+random(actor)*15,x=p.x+Math.sin(a)*d,z=p.z+Math.cos(a)*d;if(clearLine(p.x,p.z,x,z)){actor.target={x,z};return;}}actor.target=null;}
 function validPosition(x,z){if(isWalkable(x,z))return [x,0,z];for(let r=1;r<12;r++)for(let i=0;i<16;i++){const a=i*Math.PI/8,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(isWalkable(xx,zz))return [xx,0,zz];}return [13,0,25];}
 // Model containers are cached inside the engine; each actor gets its own rig.
 const jobs=seeds.slice(0,number).map(async(point,i)=>{
  const model=NPC_CATALOG[i%NPC_CATALOG.length];
  onProgress(`3D-Passanten werden geladen … ${serial} / ${number}`);
  const speed = .9 + (i % 3) * .1;
  const height = model.height + (i % 3 - 1) * .035;
  const npc = await game.loadNpc({...model, position:validPosition(...point), height,
   rotationY:0, animationSpeed:speed / model.walkSpeed});
  if (disposed) { npc.dispose(); return; }
  const actor = {id:`passant-${i+1}`,index:i,model,height,npc,seed:11987+i*1709,speed,target:null,
   wardrobe:null,grooming:null};
  try {
   if (historical) {
    // These actors own their cloned nodes. Hide modern handheld props only here.
    for (const node of npc.root.getDescendants()) {
     if (/(?:^|[-. ])(?:phone|briefcase|original held accessory)(?:$|[-. ])/i.test(node.name)) {
      node.setEnabled(false);
     }
    }
    actor.wardrobe = wardrobe?.createPeriodWardrobe(game,npc,{
     model:model.id,style:headwear[i],era,variant:i,fabricColour:fabrics[i],
    });
    actor.grooming = grooming?.createPeriodGrooming(game,npc,{era,model:model.id,variant:i});
   }
   chooseTarget(actor);
   actors.push(actor);
   serial++;
  } catch (error) {
   actor.grooming?.dispose();
   actor.wardrobe?.dispose();
   npc.dispose();
   throw error;
  }
  onProgress(`3D-Passanten werden geladen … ${serial} / ${number}`);
 });
 const results=await Promise.allSettled(jobs);
 actors.sort((a,b)=>a.index-b.index);
 const errors=results.filter(r=>r.status==='rejected');
 errors.forEach(r=>console.warn('Ein Passant konnte nicht geladen werden',r.reason));
 if(!actors.length&&errors.length)throw errors[0].reason;
 return {
  get count(){return actors.length;},
  get distinctFaces(){return new Set(actors.map(a=>a.model.id)).size;},
  get catalog(){return NPC_CATALOG;},
  update(dt,time){if(disposed||paused)return;for(const a of actors){const p=a.npc.root.position;if(!a.target){chooseTarget(a);continue;}const dx=a.target.x-p.x,dz=a.target.z-p.z,dist=Math.hypot(dx,dz);if(dist<.25){chooseTarget(a);continue;}const step=Math.min(dist,a.speed*Math.min(dt,.05)),x=p.x+dx/dist*step,z=p.z+dz/dist*step;if(!isWalkable(x,z)){chooseTarget(a);continue;}p.x=x;p.z=z;const desired=Math.atan2(dx,dz);let delta=desired-a.npc.root.rotation.y;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;a.npc.root.rotation.y+=delta*Math.min(1,dt*5);a.wardrobe?.update?.(dt,time);}},
  getCharacters(){return actors.map(a=>({id:a.id,model:a.model.id,position:[a.npc.root.position.x,a.npc.root.position.y,a.npc.root.position.z],height:a.height,rotationY:a.npc.root.rotation.y,wardrobe:a.model.wardrobe}));},
  setPaused(value){paused=Boolean(value);for(const a of actors)for(const clip of a.npc.animationGroups)paused?clip.pause():clip.play(true);},
  dispose(){if(disposed)return;disposed=true;for(const a of actors){a.grooming?.dispose();a.wardrobe?.dispose();a.npc.dispose();}actors.length=0;}
 };
}
