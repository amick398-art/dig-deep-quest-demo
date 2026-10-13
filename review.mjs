import {frameAt} from './effects.mjs';
const variants = [
  ['DIG','DIG token'],['FENN','FENN token'],['NOMO','NOMO token'],
  ['DIG shard','DIG shard'],['FENN shard','FENN shard'],['+1 shovel','Shovel discovery'],
  ['DIG crystal','Emerald crystal'],['FENN crystal','Ruby crystal'],['NOMO crystal','Diamond crystal'],
  ['Empty','Empty position'],['Copper','Copper metal'],['Silver','Silver metal'],['Gold','Gold metal'],['Platinum','Platinum metal'],
];
const grid=document.getElementById('light-review');
for(const [label,type] of variants) {
  const card=document.createElement('section');card.className='review-card';
  const title=document.createElement('h3');title.textContent=type;
  const window=document.createElement('div');window.className='review-window';
  const status=document.createElement('span');status.textContent='Light · not excavated';
  const name=document.createElement('strong');name.textContent=label;
  window.append(status,name);
  const note=document.createElement('p');note.textContent=['Copper','Silver','Gold','Platinum'].includes(label)?'Excavate first. Pickaxe remains unavailable.':'No shovel consumed, payout issued, or progress awarded.';
  card.append(title,window,note);grid.append(card);
}
try {
  const response=await fetch('./assets/bindings.json');
  if(!response.ok)throw new Error();
  const count=Object.values((await response.json()).assets||{}).filter(x=>x.sourceVerified===true).length;
  document.getElementById('original-status').textContent=`${count} verified original artwork bindings available. ${count===0?'All official visual slots remain pending transfer.':'Unbound identities remain pending.'}`;
} catch {
  document.getElementById('original-status').textContent='Original artwork status unavailable. No draft has been marked approved.';
}
try {
 const bindings=(await (await fetch('./assets/bindings.json')).json()).assets||{};
 const gallery=document.getElementById('approved-gallery');
 for(const [id,binding] of Object.entries(bindings)){
  if(!binding.sourceVerified)continue;
  const card=document.createElement('section');card.className='review-card';
  const img=document.createElement('img');img.src=binding.file;img.alt=id;img.loading='lazy';
  const label=document.createElement('h3');label.textContent=id;
  const note=document.createElement('p');note.textContent='APPROVED ORIGINAL · pixels preserved';
  card.append(img,label,note);gallery.append(card);
 }
}catch{document.getElementById('approved-gallery').textContent='Artwork index unavailable.';}
try{
 const sequences=(await (await fetch('./assets/animation-data.json')).json()).animations||[];
 for(const sequence of sequences){
  const card=document.createElement('section');card.className='review-card review-animation';
  const name=document.createElement('h3');name.textContent=sequence.id;
  const canvas=document.createElement('canvas');canvas.width=sequence.canvas.width;canvas.height=sequence.canvas.height;
  const context=canvas.getContext('2d'),image=new Image();image.src=sequence.atlas.path;
  const play=document.createElement('button');play.textContent=`Play · ${sequence.frames.length} frames · ${sequence.duration_ms} ms`;
  const paint=(elapsed)=>{const frame=frameAt(sequence,elapsed);context.clearRect(0,0,canvas.width,canvas.height);const [x,y,w,h]=frame.atlas_rect;context.drawImage(image,x,y,w,h,0,0,w,h);};
  image.onload=()=>paint(0);
  play.onclick=()=>{if(!image.complete||!image.naturalWidth)return;play.disabled=true;const start=performance.now();function tick(now){const t=now-start;paint(t);if(t<sequence.duration_ms)requestAnimationFrame(tick);else play.disabled=false;}requestAnimationFrame(tick);};
  const note=document.createElement('p');note.textContent='APPROVED ORIGINAL MOTION · new preview player; no gameplay settlement';card.append(name,canvas,play,note);document.getElementById('animation-gallery').append(card);
 }
}catch{document.getElementById('animation-gallery').textContent='Animation index unavailable.';}
try{
 const candidates=(await (await fetch('./assets/candidate-bindings.json')).json()).assets||{};
 for(const [id,row] of Object.entries(candidates)){
  const card=document.createElement('section');card.className='review-card';const name=document.createElement('h3');name.textContent=id;
  const image=row.region?document.createElement('div'):document.createElement('img');
  if(row.region){const scale=130/row.height;image.className='concept-tool';Object.assign(image.style,{width:`${row.width*row.region[2]*scale}px`,height:'130px',backgroundImage:`url('${row.file}')`,backgroundSize:`${row.width*scale}px 130px`,backgroundPosition:`${-row.width*row.region[0]*scale}px 0`});image.setAttribute('role','img');image.setAttribute('aria-label',id+' new review concept');}else{image.src=row.file;image.alt=id+' review candidate';image.loading='lazy';}
  const note=document.createElement('p');note.textContent=row.status+' · NOT APPROVED FINAL';card.append(name,image,note);document.getElementById('candidate-gallery').append(card);
 }
}catch{document.getElementById('candidate-gallery').textContent='Review candidate index unavailable.';}
