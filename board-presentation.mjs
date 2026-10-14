// Runtime crops from unchanged owner-approved original; no new emblem or dirt artwork.
export const BOARD_ORIGINAL='assets/boards/approved_full_board.jpg';
export const POOL_EMBLEMS={DIG:[652,423,63,63],FENN:[651,501,64,73],NOMO:[651,595,64,73]};
export function restorePoolEmblems(){
 for(const [token,region]of Object.entries(POOL_EMBLEMS)){const host=document.querySelector(`.scene-pool-${token.toLowerCase()} .scene-pool-emblem`);if(!host)continue;const [x,y,w,h]=region,img=document.createElement('img');host.style.aspectRatio=w+'/'+h;img.src=BOARD_ORIGINAL;img.alt=`Approved ${token} reward pool emblem`;Object.assign(img.style,{width:853/w*100+'%',left:-x/w*100+'%',top:-y/h*100+'%'});host.append(img);}
}
export async function restoreCleanBoard(canvas,layout){
 const original=await new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=BOARD_ORIGINAL;});if(!original)return;
 canvas.width=layout.width;canvas.height=layout.height;const ctx=canvas.getContext('2d'),[vx,vy]=layout.source.viewport;
 ctx.drawImage(original,vx,vy,layout.width,layout.height,0,0,layout.width,layout.height);
 // Clone the first clean dirt tile and its existing metal trim over printed focus glows.
 // Three pixels of trim hide the original yellow/blue highlights without touching labels/frame.
 for(const {rect:[x,y,w,h]}of layout.cells)ctx.drawImage(original,262,208,71,72,x-3,y-3,w+6,h+6);
 canvas.dataset.ready='true';
}
