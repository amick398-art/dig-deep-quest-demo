// New presentation only. The engine saves the confirmed descent before playback.
import {RULES,resolved} from './engine.mjs';

export function descentStages(previous,next){
 if(next.depth!==previous.depth+1)return [];
 return previous.earlyDescent&&resolved(previous)<RULES.descent?['pass','tunnel']:['tunnel'];
}

export class DescentCinematic{
 constructor(dialog,{onTunnelStart=()=>{}}={}){
  this.dialog=dialog;this.canvas=dialog.querySelector('canvas');this.pass=dialog.querySelector('.descent-pass');
  this.status=dialog.querySelector('[data-descent-status]');this.title=dialog.querySelector('[data-descent-title]');
  this.onTunnelStart=onTunnelStart;this.playing=false;this.cancelFrame=null;this.texture=null;
  const image=new Image();image.onload=()=>{this.texture=image;};image.src='assets/blocks/tile_covered.png';
 }
 async play(previous,next){
  const stages=descentStages(previous,next);if(!stages.length||this.playing)return;
  this.playing=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focus=document.activeElement,position={x:scrollX,y:scrollY};
  let stopped=false;const stop=()=>{stopped=true;this.cancelFrame?.();};
  const skip=this.dialog.querySelector('[data-descent-skip]');skip.addEventListener('click',stop);
  const cancel=event=>{event.preventDefault();stop();};this.dialog.addEventListener('cancel',cancel);
  this.title.textContent=`Depth ${previous.depth} → ${next.depth}`;
  document.body.classList.add('descent-playing');
  try{
   this.dialog.showModal();
   for(const phase of stages){
    if(stopped)break;
    this.dialog.dataset.phase=phase;this.pass.hidden=phase!=='pass';this.canvas.hidden=phase!=='tunnel';
    this.status.textContent=phase==='pass'?'Using your Depth Pass':'Traveling through the mine tunnel';
    if(phase==='tunnel')this.onTunnelStart();
    const duration=phase==='pass'?(reduced?700:1100):(reduced?1100:3400);
    await this.phase(duration,phase,reduced);
   }
  }finally{
   this.cancelFrame?.();this.cancelFrame=null;
   if(this.dialog.open)this.dialog.close();
   this.dialog.dataset.phase='idle';this.pass.hidden=true;this.canvas.hidden=true;
   this.canvas.width=this.canvas.height=1;
   document.body.classList.remove('descent-playing');
   skip.removeEventListener('click',stop);this.dialog.removeEventListener('cancel',cancel);
   if(focus?.isConnected&&!focus.disabled)focus.focus({preventScroll:true});
   window.scrollTo(position.x,position.y);this.playing=false;
  }
 }
 phase(duration,phase,reduced){
  return new Promise(resolve=>{
   let frame=null,lastPaint=-Infinity,done=false;const start=performance.now();
   const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);resolve();};this.cancelFrame=finish;
   const draw=now=>{
    if(done)return;
    if(phase==='tunnel'&&(reduced?lastPaint===-Infinity:now-lastPaint>=33)){this.paint(reduced?0:(now-start)/1000);lastPaint=now;}
    if(now-start>=duration)finish();else frame=requestAnimationFrame(draw);
   };
   frame=requestAnimationFrame(draw);
  });
 }
 paint(time){
  const rect=this.canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio||1,2);
  const width=Math.round(w*dpr),height=Math.round(h*dpr);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const ctx=this.canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const vx=w/2,vy=h*.43;
  const glow=ctx.createRadialGradient(vx,vy,3,vx,vy,Math.max(w,h));glow.addColorStop(0,'#284b32');glow.addColorStop(.35,'#10291f');glow.addColorStop(1,'#030807');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  // Source tile pixels are used as an unchanged texture; the tunnel geometry is new.
  const rock=this.texture?ctx.createPattern(this.texture,'repeat'):null;ctx.fillStyle=rock||'#26352b';
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(vx-8,vy);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(w,0);ctx.lineTo(vx+8,vy);ctx.lineTo(w,h);ctx.closePath();ctx.fill();
  ctx.fillStyle='#06160edd';ctx.fillRect(0,0,w,h);
  // Rails converge at the passage ahead; sleepers and timber supports move past
  // the camera to show travel through the mine without introducing an avatar.
  ctx.fillStyle='#17261a';ctx.beginPath();ctx.moveTo(vx,vy);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
  for(const side of [-1,1]){ctx.strokeStyle='#b7bca1';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(vx+side*3,vy);ctx.lineTo(vx+side*w*.34,h);ctx.stroke();ctx.strokeStyle='#515e51';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(vx+side*2,vy);ctx.lineTo(vx+side*w*.38,h);ctx.stroke();}
  const travel=time*.48;
  for(let i=0;i<10;i++){
   const q=((i/10+travel)%1),scale=q*q,half=Math.max(4,w*.83*scale),top=vy-(vy+65)*scale,bottom=vy+(h-vy+120)*scale;
   ctx.strokeStyle='#6e492d';ctx.lineWidth=3+scale*20;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(vx-half,bottom);ctx.lineTo(vx-half,top+half*.18);ctx.lineTo(vx,top);ctx.lineTo(vx+half,top+half*.18);ctx.lineTo(vx+half,bottom);ctx.stroke();
   ctx.strokeStyle='#c09a58';ctx.lineWidth=1+scale*2;ctx.stroke();
   const floorY=vy+(h-vy)*scale;ctx.strokeStyle='#624a32';ctx.lineWidth=2+scale*6;ctx.beginPath();ctx.moveTo(vx-half*.47,floorY);ctx.lineTo(vx+half*.47,floorY);ctx.stroke();
   for(const side of [-1,1]){
    const x=vx+side*half*.83,y=vy-h*.13*scale,r=2+scale*9;
    const lamp=ctx.createRadialGradient(x,y,0,x,y,r*4);lamp.addColorStop(0,'#ffe3a3');lamp.addColorStop(.3,'#e5a141aa');lamp.addColorStop(1,'#edbc5200');ctx.fillStyle=lamp;ctx.fillRect(x-r*4,y-r*4,r*8,r*8);
    ctx.fillStyle='#e6bc66';ctx.fillRect(x-r*.35,y-r,r*.7,r*1.8);
    const cx=vx+side*half*.98,cy=vy+h*.13*scale,s=3+scale*13;ctx.fillStyle='#4be295';ctx.beginPath();ctx.moveTo(cx,cy-s);ctx.lineTo(cx+s*.55,cy);ctx.lineTo(cx,cy+s);ctx.lineTo(cx-s*.55,cy);ctx.closePath();ctx.fill();ctx.strokeStyle='#b0ffd0';ctx.lineWidth=1;ctx.stroke();
   }
  }
  // Foreground mine-cart rim gives a stable first-person reference.
  ctx.fillStyle='#223a2d';ctx.fillRect(0,h*.9,w,h*.1);ctx.fillStyle='#9c7845';ctx.fillRect(0,h*.9,w,7);ctx.strokeStyle='#c6c3a1';ctx.lineWidth=3;ctx.strokeRect(8,h*.92,w-16,h*.12);
 }
}
