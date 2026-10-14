// Original approved shop scenes with accessible hit regions. All purchases use the existing engine.
import {COSMETICS,PICKAXE_PRICE,NATIVE_PRICES,DIG_ALTERNATIVES,balance,nativeSpendable,spendable,amount} from './nft-game.mjs';
import {NFT_TYPES} from './mythic-nft.mjs';
export const CATEGORIES=[['shovels','Shovels'],['pickaxes','Pickaxes'],['special','Special Tools'],['information','Information Tools'],['boost','DIG Boost Pass'],['currencies','Currencies']];
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:12});
export function approvedArtwork(binding,label){const image=el('img');image.src=binding.file;image.alt=label;image.loading='lazy';if(!binding.region)return image;const [x,y,w,h]=binding.region,frame=el('div',undefined,'approved-art-crop');frame.style.aspectRatio=w+'/'+h;frame.style.width=w+'px';Object.assign(image.style,{width:100*binding.width/w+'%',left:-100*x/w+'%',top:-100*y/h+'%'});frame.append(image);frame.dataset.originalSource=binding.file;return frame;}
export class ApprovedShop{
 constructor(root,api){this.root=root;this.api=api;this.screen='shovels';this.selected=null;this.screens={};
  const hint=el('p','Approved original shop · simulated balances. On phones, swipe the artwork sideways or use the item buttons below.','hint');
  this.nav=el('nav',undefined,'approved-shop-nav');this.nav.setAttribute('aria-label','Shop categories');
  for(const [key,label] of CATEGORIES){const b=this.button(label,()=>this.show(key));b.dataset.shopCategory=key;this.nav.append(b);}
  this.viewport=el('div',undefined,'approved-shop-viewport');this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','Approved shop artwork; scroll horizontally to explore');
  this.scene=el('div',undefined,'approved-shop-scene');this.image=el('img');this.image.width=1280;this.image.height=853;this.image.className='approved-shop-original';this.hotspots=el('div',undefined,'approved-shop-hotspots');this.scene.append(this.image,this.hotspots);this.viewport.append(this.scene);
  this.items=el('div',undefined,'approved-shop-items');this.items.setAttribute('role','group');this.items.setAttribute('aria-label','Items on the selected shop screen');
  this.detail=el('section',undefined,'approved-shop-detail');this.detail.setAttribute('aria-label','Selected shop item');this.notice=el('p',undefined,'approved-shop-notice');this.notice.setAttribute('role','status');
  root.append(this.nav,hint,this.viewport,this.items,this.detail,this.notice);
 }
 button(label,action){const b=el('button',label);b.type='button';b.onclick=action;return b;}
 async load(){const response=await fetch('./assets/shop-screens.json');if(!response.ok)throw Error('Approved shop screen index unavailable.');this.screens=(await response.json()).screens;this.show(this.screen);}
 show(category){this.screen=category;this.selected=null;this.root.dataset.screen=category;this.image.hidden=!this.screens[category];this.hotspots.replaceChildren();this.items.replaceChildren();this.detail.replaceChildren();
  for(const b of this.nav.children)b.setAttribute('aria-pressed',String(b.dataset.shopCategory===category));
  if(this.screens[category]){this.viewport.hidden=false;this.image.src=this.screens[category].file;this.image.alt='Owner-approved '+CATEGORIES.find(([k])=>k===category)[1]+' shop screen';
   for(let i=0;i<CATEGORIES.length;i++){const [key,label]=CATEGORIES[i];this.hotspot(label,[15,211+i*65,222,58],()=>this.show(key));}
   this.hotspot('Back to mine',[17,754,163,66],()=>document.getElementById('shop-panel').close());
   this.hotspot('Connect simulated wallet',[1044,114,199,44],()=>this.wallets());
  }else{this.viewport.hidden=true;this.detail.append(el('p',category==='boost'?'Approved DIG Boost Pass image has not arrived. Existing DIG-only pass purchase and status controls remain below.':'This approved shop image is awaiting its own verified integration checkpoint.'));}
  for(const item of this.catalogue(category)){const action=()=>this.select(item);if(this.screens[category])this.hotspot(item.label,item.rect,action,item.key);const b=this.button(item.label,action);b.dataset.shopItem=item.key;this.items.append(b);}
  this.viewport.scrollLeft=category==='shovels'?245:250;this.refresh();
 }
 hotspot(label,rect,action,key){const b=this.button('',action);b.className='shop-art-hit';b.setAttribute('aria-label',label);if(key)b.dataset.shopHit=key;const [x,y,w,h]=rect;Object.assign(b.style,{left:100*x/1280+'%',top:100*y/853+'%',width:100*w/1280+'%',height:100*h/853+'%'});this.hotspots.append(b);}
 catalogue(category){
  if(category==='shovels')return [...['basic','copper','bronze','iron','silver','gold','platinum','crystal','obsidian','void'].map((key,i)=>({key,label:key+' shovel',kind:'cosmetic',rect:[273+98*i,223,94,174]})),{key:'diamond',label:'Diamond legendary shovel',kind:'cosmetic',rect:[274,475,140,221]},{key:'shadow_forge',label:'Shadow Forge legendary shovel',kind:'cosmetic',rect:[417,475,140,221]},...['NOMO','Oso','Bebe','FENN','DIG'].map((key,i)=>({key,label:key+' Mythic NFT',kind:'nft',rect:[596+i*132,460,124,237]}))];
  return [];
 }
 select(item){this.selected=item;this.renderDetail();this.detail.scrollIntoView({block:'nearest',behavior:'instant'});this.detail.querySelector('h3')?.focus({preventScroll:true});}
 renderDetail(){this.detail.replaceChildren();const item=this.selected;if(!item)return;const s=this.api.getGame(),heading=el('h3',item.label);heading.tabIndex=-1;this.detail.append(heading);
  if(item.kind==='cosmetic'){const price=COSMETICS[item.key],owned=s.cosmetics.includes(item.key);this.detail.append(el('p',`${fmt(price)} DIG · permanent cosmetic. No digging actions, reward bonus or improved odds. ${owned?'Owned.':'Not owned.'} Current skin: ${s.equipped}.`));const b=this.button(owned?'Equip '+item.label:'Buy '+item.label,()=>owned?this.api.perform('equip',{key:item.key}):this.api.confirm('Buy '+item.label+'?',`${fmt(price)} DIG. Permanent cosmetic only; no actions or NFT bonus. Allocation: 90% DIG reward pool, 5% Oso, 5% Bebe.`,()=>this.api.perform('buyCosmetic',{key:item.key})));b.dataset.shopPurchase=item.key;b.disabled=s.equipped===item.key;this.detail.append(b);}
  if(item.kind==='nft'){const spec=NFT_TYPES[item.key];this.detail.append(el('p',`${spec.cap} fixed editions · permanent +${spec.bonusBps/100}% ${spec.currencies.join('/')} regular rewards · $${(spec.usdCents/100).toFixed(2)} USD mint. Payment: ${spec.currencies.join(' + ')}. Transferable independent collection; only one equipped. Simulated minting only.`),this.button('View '+item.key+' NFT mint, ownership and equipment',()=>{const details=document.getElementById('mythic-nfts');details.open=true;details.scrollIntoView({block:'start'});document.querySelector('.nft-card[data-nft-type="'+item.key+'"]')?.scrollIntoView({block:'center'});}));}
 }
 wallets(){this.detail.replaceChildren(el('h3','Simulated wallet connection'),el('p','Real NOMO Supply wallet integration is not connected. These linked test wallets share one local profile.'));const s=this.api.getGame();for(const w of s.account.wallets){const b=this.button(w.id,()=>this.api.perform('selectWallet',{walletId:w.id}));b.disabled=w.id===s.account.receivingWallet;this.detail.append(b);}const label=el('label','New simulated wallet name'),input=el('input');input.id='shop-wallet-name';input.maxLength=40;label.htmlFor=input.id;this.detail.append(label,input,this.button('Link simulated wallet',()=>{const walletId=input.value.trim();if(walletId)this.api.perform('linkWallet',{walletId}).then(()=>this.wallets());}));}
 refresh(){const s=this.api.getGame();this.notice.textContent=`Simulated wallet: ${s.account.receivingWallet} · DIG ${fmt(s.wallet)} · NOMO ${fmt(balance(s,'NOMO'))} · FENN ${fmt(balance(s,'FENN'))} · ${s.shovels} digging actions · ${s.nftEquipped?'Mythic equipped':'No Mythic equipped'}`;
  for(const [i,token] of ['DIG','NOMO','FENN'].entries()){let value=this.hotspots.querySelector('[data-shop-balance="'+token+'"]');if(!value&&this.screens[this.screen]){value=el('span',undefined,'shop-art-balance');value.dataset.shopBalance=token;Object.assign(value.style,{left:(792+i*177)/12.8+'%',top:56/8.53+'%',width:108/12.8+'%',height:32/8.53+'%'});this.hotspots.append(value);}if(value)value.textContent=fmt(balance(s,token));}
  // Keep nodes stable during idle ticks, preserving focus and mobile scroll.
  if(this.selected){const key=JSON.stringify([s.cosmetics,s.equipped,s.nftEquipped,s.account.receivingWallet]);if(key!==this.detailKey){this.detailKey=key;this.renderDetail();}}
 }
}
