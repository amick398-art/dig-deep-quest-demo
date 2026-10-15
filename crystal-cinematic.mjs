// New motion using unchanged existing crystal/fragment artwork; owner review candidate.
export const FUSION_DURATION=4200;
export function fusionFrame(elapsed){const t=Math.max(0,Math.min(1,elapsed/FUSION_DURATION));return {t,phase:t<.23?'gather':t<.55?'orbit':t<.70?'merge':t<.80?'flash':'reward',radius:t<.23?130:t<.70?130*(1-(t-.23)/.47):0,angle:t*Math.PI*6,crystalOpacity:Math.max(0,Math.min(1,(t-.62)/.15)),amountOpacity:Math.max(0,Math.min(1,(t-.78)/.12))};}
export function crystalAmount(units){const n=BigInt(units),f=(n%1000000000000n).toString().padStart(12,'0').replace(/0+$/,'');return (n/1000000000000n).toLocaleString('en-US')+(f?'.'+f:'');}
export class CrystalFusionCinematic{
 constructor(dialog,{getArt}={}){this.dialog=dialog;this.getArt=getArt;this.finish=null;dialog.querySelector('[data-fusion-skip]').onclick=()=>this.finish?.();dialog.addEventListener('cancel',e=>{e.preventDefault();this.finish?.();});dialog.addEventListener('close',()=>this.finish?.());}
 async play(reward){if(this.finish)throw Error('Fusion animation already active.');if(!['DIG','FENN'].includes(reward.asset))throw Error('NOMO has no shard fusion.');
  const d=this.dialog,canvas=d.querySelector('canvas'),ctx=canvas.getContext('2d'),name=reward.asset==='DIG'?'Emerald':'Ruby',color=reward.asset==='DIG'?'#4dffb3':'#ff5471';
  d.dataset.asset=reward.asset;d.dataset.rewardId=reward.id;d.dataset.newWork='New fusion motion awaiting review';d.querySelector('[data-fusion-title]').textContent=`${reward.asset} ${name} Crystal`;d.querySelector('[data-fusion-amount]').textContent=`+${crystalAmount(reward.units)} ${reward.asset}`;d.querySelector('[data-fusion-status]').textContent='Ten shards. One crystal. Your reward is safely reserved.';d.querySelector('[data-fusion-bonus]').textContent='Crystal reward · Mythic bonuses do not apply';
  let done=false,raf=0,resolve;const completed=new Promise(r=>resolve=r);
  const stop=()=>{if(done)return;done=true;cancelAnimationFrame(raf);if(d.open)d.close();this.finish=null;resolve();};this.finish=stop;d.showModal();
  const load=file=>new Promise(r=>{if(!file){r(null);return;}const img=new Image();const timer=setTimeout(()=>r(null),500);img.onload=()=>{clearTimeout(timer);r(img);};img.onerror=()=>{clearTimeout(timer);r(null);};img.src=file;});
  const [shard,whole]=await Promise.race([Promise.all([load(this.getArt?.('shard',reward.asset)),load(this.getArt?.('crystal',reward.asset))]),completed.then(()=>[null,null])]);if(done)return completed;
  const start=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?800:FUSION_DURATION;
  const draw=now=>{if(done)return;const frame=fusionFrame((now-start)*FUSION_DURATION/duration),{t}=frame,w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;d.dataset.phase=frame.phase;ctx.clearRect(0,0,w,h);const glow=ctx.createRadialGradient(cx,cy,2,cx,cy,230);glow.addColorStop(0,color+'aa');glow.addColorStop(1,'#07120d00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
   if(t<.72)for(let i=0;i<10;i++){const a=i*Math.PI/5+frame.angle,x=cx+Math.cos(a)*frame.radius,y=cy+Math.sin(a)*frame.radius*.74,size=32+Math.min(12,t*20);ctx.save();ctx.translate(x,y);ctx.rotate(a*.3);ctx.shadowColor=color;ctx.shadowBlur=18+30*t;ctx.globalAlpha=t<.65?Math.min(1,t*6):Math.max(0,(.72-t)/.07);if(shard)ctx.drawImage(shard,-size/2,-size/2,size,size);ctx.restore();}
   if(whole&&frame.crystalOpacity>0){const ratio=whole.width/whole.height,height=185*(.8+.2*frame.crystalOpacity),width=height*ratio;ctx.save();ctx.globalAlpha=frame.crystalOpacity;ctx.shadowColor=color;ctx.shadowBlur=40;ctx.drawImage(whole,cx-width/2,cy-height/2,width,height);ctx.restore();}
   for(let i=0;i<24;i++){const a=i*Math.PI/12+t*2,r=50+150*((t+i/24)%1);ctx.globalAlpha=Math.max(0,Math.sin(t*Math.PI))*0.7;ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
   if(frame.phase==='flash'){ctx.fillStyle=`rgba(230,255,240,${Math.max(0,1-Math.abs(t-.75)*20)*.65})`;ctx.fillRect(0,0,w,h);}
   d.querySelector('[data-fusion-amount]').style.opacity=frame.amountOpacity;d.querySelector('[data-fusion-status]').textContent=t<.7?'Shards are fusing…':t<.8?'Crystal formed!':'Reward confirmed · crediting when this animation ends';
   if(t>=1)stop();else raf=requestAnimationFrame(draw);
  };raf=requestAnimationFrame(draw);return completed;
 }
}
