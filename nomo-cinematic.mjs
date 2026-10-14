// New presentation using the exact approved Special Tools character and board pixels.
// Playback cannot charge, dig, reroll, claim or update saved inventory.
import boardLayout from './approved-board-layout.mjs?v=nomo-run-20261014';
export const NOMO_ART=Object.freeze({file:'assets/shop/approved_special.jpg',rect:[301,265,166,175]});
export const NOMO_PHASES=Object.freeze([['run',1800],['fuse',650],['blast',400],['reveal',650]]);
export function nomoRunPlan(previous,next,data){
 if(data.kind!=='dynamite'||previous===next||previous.depth!==next.depth||!Number.isInteger(data.index)||data.index<0||data.index>=45)return null;
 const row=Math.floor(data.index/5),indices=Array.from({length:10},(_,i)=>row*5+i);
 if(!indices.every(i=>previous.board[i]?.state==='covered'&&next.board[i]?.state!=='covered'))return null;
 return {row,indices,depth:next.depth};
}
export function backdropPixel(r,g,b){return r<=23&&g<=38&&b<=42&&g-r>5&&b-r>5&&Math.abs(g-b)<=10;}
function image(file){return new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=file;});}
function character(source){
 if(!source)return null;
 const [x,y,w,h]=NOMO_ART.rect,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(source,x,y,w,h,0,0,w,h);
 // Remove only edge-connected dark teal background. Preserve black clothes, feather, skin and beard.
 const pixels=ctx.getImageData(0,0,w,h),seen=new Uint8Array(w*h),queue=[];
 const visit=(n)=>{if(n<0||n>=w*h||seen[n])return;seen[n]=1;const k=n*4;if(backdropPixel(pixels.data[k],pixels.data[k+1],pixels.data[k+2]))queue.push(n);};
 for(let i=0;i<w;i++){visit(i);visit((h-1)*w+i);}for(let j=0;j<h;j++){visit(j*w);visit(j*w+w-1);}
 for(let q=0;q<queue.length;q++){const n=queue[q];pixels.data[n*4+3]=0;if(n%w)visit(n-1);if(n%w<w-1)visit(n+1);visit(n-w);visit(n+w);}
 ctx.putImageData(pixels,0,0);return c;
}
export class NomoRunCinematic{
 constructor(dialog,{getArt=()=>null,onBlast=()=>{}}={}){
  this.dialog=dialog;this.canvas=dialog.querySelector('canvas');this.status=dialog.querySelector('[data-nomo-status]');this.getArt=getArt;this.onBlast=onBlast;this.playing=false;
  this.ready=Promise.all([image(NOMO_ART.file),image('assets/boards/approved_full_board.jpg')]).then(([s,b])=>{this.sprite=character(s);this.board=b;this.dialog.dataset.characterReady=String(Boolean(this.sprite));});
 }
 async play(previous,next,data){
  const plan=nomoRunPlan(previous,next,data);if(!plan||this.playing)return;
  this.playing=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,position={x:scrollX,y:scrollY},focus=document.activeElement;
  let stopped=false,frameId=0,release;const stopPromise=new Promise(r=>{release=r;}),stop=()=>{stopped=true;cancelAnimationFrame(frameId);release();};
  const skip=this.dialog.querySelector('[data-nomo-skip]'),cancel=e=>{e.preventDefault();stop();},hidden=()=>{if(document.hidden)stop();};
  skip.addEventListener('click',stop);this.dialog.addEventListener('cancel',cancel);this.dialog.addEventListener('close',stop);document.addEventListener('visibilitychange',hidden);
  this.dialog.dataset.rows=`${plan.row+1}-${plan.row+2}`;this.dialog.dataset.artSource=NOMO_ART.file;document.body.classList.add('nomo-playing');
  try{
   this.dialog.dataset.phase='loading';this.status.textContent=`Depth ${plan.depth} · rows ${plan.row+1}–${plan.row+2}`;this.dialog.showModal();
   await Promise.race([this.ready,stopPromise]);if(stopped)return;
   const files=plan.indices.map(i=>['DIG','FENN','NOMO'].includes(next.board[i].kind)?null:this.getArt(next.board[i]));
   const art=await Promise.race([Promise.all(files.map(f=>f?image(f):null)),stopPromise]);if(stopped)return;
   for(const [phase,duration] of NOMO_PHASES){
    if(stopped)break;this.dialog.dataset.phase=phase;
    this.status.textContent={run:`NOMO plants charges across rows ${plan.row+1}–${plan.row+2}`,fuse:'Charges planted — stand back!',blast:'Dynamite detonates',reveal:'10 positions excavated · metal still needs its matching pickaxe'}[phase];
    if(phase==='blast')this.onBlast();const ms=reduced?{run:250,fuse:180,blast:80,reveal:350}[phase]:duration;
    await Promise.race([new Promise(resolve=>{const start=performance.now();const draw=now=>{const t=Math.min(1,(now-start)/ms);this.paint(phase,t,plan,next,art,reduced);if(t<1&&!stopped)frameId=requestAnimationFrame(draw);else resolve();};frameId=requestAnimationFrame(draw);}),stopPromise]);
   }
  }finally{
   stop();skip.removeEventListener('click',stop);this.dialog.removeEventListener('cancel',cancel);this.dialog.removeEventListener('close',stop);document.removeEventListener('visibilitychange',hidden);
   if(this.dialog.open)this.dialog.close();this.dialog.dataset.phase='idle';document.body.classList.remove('nomo-playing');this.playing=false;window.scrollTo(position.x,position.y);
   const target=focus?.getClientRects().length?focus:document.querySelector('#board [aria-pressed="true"]');target?.focus({preventScroll:true});
  }
 }
 paint(phase,t,plan,next,art,reduced){
  const ctx=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#091713';ctx.fillRect(0,0,w,h);
  const tw=104,th=94,gap=10,x0=40,y0=70;
  for(let n=0;n<10;n++){
   const i=plan.indices[n],x=x0+n%5*(tw+gap),y=y0+Math.floor(n/5)*(th+gap),cell=next.board[i];
   ctx.fillStyle='#153129';ctx.fillRect(x,y,tw,th);ctx.strokeStyle='#97764c';ctx.lineWidth=3;ctx.strokeRect(x,y,tw,th);
   if(phase!=='reveal'&&this.board){const [sx,sy,sw,sh]=this.layoutCell(i);ctx.drawImage(this.board,sx,sy,sw,sh,x+2,y+2,tw-4,th-4);}
   if(phase==='reveal'){
    if(art[n])ctx.drawImage(art[n],x+14,y+8,tw-28,th-26);
    const label=cell.kind==='empty'?'Cleared':cell.kind==='shard'?cell.asset+' shard':cell.kind==='crystal'?cell.asset+' crystal':cell.kind==='shovel'?'+1 shovel':cell.kind;
    ctx.fillStyle='#ecf3d1';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(label,x+tw/2,y+th-7);
   }
  }
  const count=phase==='run'?(reduced?5:Math.min(5,Math.floor(t*5))):5;
  if(phase!=='reveal')for(let j=0;j<count;j++)this.charge(ctx,x0+tw/2+j*(tw+gap),y0+th+gap/2,phase==='fuse');
  if(phase==='run'&&this.sprite){const x=reduced?w/2:25+t*(w-50),bob=reduced?0:Math.sin(t*45)*3;ctx.save();ctx.translate(x,190+bob);ctx.rotate(reduced?0:Math.sin(t*35)*.035);ctx.drawImage(this.sprite,-54,-118,108,118);ctx.restore();}
  if(phase==='blast'&&!reduced){ctx.fillStyle=`rgba(255,203,80,${Math.sin(Math.PI*t)*.52})`;ctx.fillRect(0,0,w,h);for(let j=0;j<5;j++){ctx.strokeStyle='#ffba4e';ctx.lineWidth=6*(1-t);ctx.beginPath();ctx.arc(x0+tw/2+j*(tw+gap),y0+th,12+t*80,0,Math.PI*2);ctx.stroke();}}
  ctx.fillStyle='#f9dea1';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText(`Depth ${plan.depth} · rows ${plan.row+1} and ${plan.row+2}`,w/2,35);
 }
 layoutCell(index){const [x,y,w,h]=boardLayout.cells[index].rect;return [x+boardLayout.source.viewport[0],y+boardLayout.source.viewport[1],w,h];}
 charge(ctx,x,y,lit){ctx.save();ctx.translate(x,y);for(let i=-1;i<=1;i++){ctx.fillStyle=i===0?'#f44b36':'#b51913';ctx.fillRect(i*7-3,-12,6,24);ctx.fillStyle='#e6b656';ctx.fillRect(i*7-3,-3,6,4);}ctx.strokeStyle='#d1aa64';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-12);ctx.quadraticCurveTo(7,-24,17,-14);ctx.stroke();if(lit){ctx.fillStyle='#ffe282';ctx.beginPath();ctx.arc(17,-14,4,0,Math.PI*2);ctx.fill();}ctx.restore();}
}
