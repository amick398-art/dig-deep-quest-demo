// New presentation only. The engine saves the confirmed descent before playback.
import {RULES,resolved} from './engine.mjs';

// Coordinates refer to the unchanged 1024 × 1536 approved Depth Pass card.
// Straighten only its illustrated passage at runtime; no replacement art is drawn.
export const TUNNEL_ART=Object.freeze({file:'assets/equipment/depth_pass.png',width:420,height:480,centerX:509,centerY:824,angle:14*Math.PI/180,exitX:27,exitY:189});

export function descentStages(previous,next){
 if(next.depth!==previous.depth+1)return [];
 return previous.earlyDescent&&resolved(previous)<RULES.descent?['pass','tunnel']:['tunnel'];
}

export class DescentCinematic{
 constructor(dialog,{onTunnelStart=()=>{}}={}){
  this.dialog=dialog;this.canvas=dialog.querySelector('canvas');this.pass=dialog.querySelector('.descent-pass');
  this.status=dialog.querySelector('[data-descent-status]');this.title=dialog.querySelector('[data-descent-title]');
  this.onTunnelStart=onTunnelStart;this.playing=false;this.cancelFrame=null;this.tunnel=null;
  this.artReady=new Promise(resolve=>{
   const image=new Image();image.onload=()=>{
    const crop=document.createElement('canvas');crop.width=TUNNEL_ART.width;crop.height=TUNNEL_ART.height;
    const ctx=crop.getContext('2d');ctx.translate(crop.width/2,crop.height/2);ctx.rotate(-TUNNEL_ART.angle);
    ctx.drawImage(image,-TUNNEL_ART.centerX,-TUNNEL_ART.centerY);this.tunnel=crop;
    this.canvas.dataset.artSource=TUNNEL_ART.file;resolve();
   };
   image.onerror=()=>resolve();image.src=TUNNEL_ART.file;
  });
 }
 async play(previous,next){
  const stages=descentStages(previous,next);if(!stages.length||this.playing)return;
  this.playing=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focus=document.activeElement,position={x:scrollX,y:scrollY};
  let stopped=false,releaseWait;const skipWait=new Promise(resolve=>{releaseWait=resolve;});
  const stop=()=>{stopped=true;releaseWait();this.cancelFrame?.();};
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
    if(phase==='tunnel'){await Promise.race([this.artReady,skipWait]);if(stopped)break;this.onTunnelStart();}
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
  ctx.fillStyle='#030b07';ctx.fillRect(0,0,w,h);
  if(!this.tunnel){this.status.textContent='Tunnel artwork could not load — you can skip to your next depth';return;}
  const {width:sw,height:sh,exitX,exitY}=TUNNEL_ART;
  // Preserve the complete illustrated passage on phones and wide desktops.
  // Camera motion advances toward its existing green exit, without drawing
  // invented rails, crystals, timber, characters or a mine cart over the card.
  const scale=Math.min(w/sw,Math.max(1,h-170)/sh),dw=sw*scale,dh=sh*scale;
  const progress=Math.max(0,Math.min(time/3.4,1)),zoom=1+.45*progress;
  ctx.save();ctx.translate(w/2,h/2);ctx.beginPath();ctx.rect(-dw/2,-dh/2,dw,dh);ctx.clip();
  ctx.scale(scale,scale);ctx.translate(exitX,exitY);ctx.scale(zoom,zoom);ctx.translate(-exitX,-exitY);
  ctx.drawImage(this.tunnel,-sw/2,-sh/2);ctx.restore();
 }
}
