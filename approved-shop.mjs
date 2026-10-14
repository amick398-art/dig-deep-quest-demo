// Original approved shop scenes with accessible hit regions. All purchases use the existing engine.
import {COSMETICS,PICKAXE_PRICE,NATIVE_PRICES,DIG_ALTERNATIVES,balance,nativeSpendable,spendable,amount,bulkTargets,resolved} from './nft-game.mjs';
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
  this.feedback=el('p',undefined,'approved-shop-feedback');this.feedback.id='approved-shop-message';this.feedback.setAttribute('role','status');this.feedback.setAttribute('aria-live','polite');root.append(this.nav,hint,this.feedback,this.viewport,this.items,this.detail,this.notice);
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
  if(category==='pickaxes')return ['DIG','FENN','NOMO'].flatMap((family,r)=>['copper','silver','gold','platinum'].map((tier,c)=>({key:family+'-'+tier,label:family+' '+tier+' pickaxe',kind:'pickaxe',family,tier,rect:[438+c*209,246+r*149,125,124]})));
  if(category==='special')return [{key:'dynamite',label:'NOMO Dynamite Run',kind:'bulk',rect:[286,250,463,203]},{key:'drill',label:'FENN Deep Drill',kind:'bulk',rect:[769,250,463,203]},{key:'smallCharge',label:'Small Charge',kind:'bulk',rect:[286,465,463,203]},{key:'depthPass',label:'Depth Pass',kind:'depth',rect:[769,465,463,203]}];
  return [];
 }
 select(item){if(item.kind==='pickaxe')this.api.setFamily(item.family);this.selected=item;this.renderDetail();this.detail.scrollIntoView({block:'nearest',behavior:'instant'});this.detail.querySelector('h3')?.focus({preventScroll:true});}
 renderDetail(){this.detail.replaceChildren();const item=this.selected;if(!item)return;const s=this.api.getGame(),heading=el('h3',item.label);heading.tabIndex=-1;this.detail.append(heading);
  if(item.kind==='cosmetic'){const price=COSMETICS[item.key],owned=s.cosmetics.includes(item.key);this.detail.append(el('p',`${fmt(price)} DIG · permanent cosmetic. No digging actions, reward bonus or improved odds. ${owned?'Owned.':'Not owned.'} Current skin: ${s.equipped}.`));const b=this.button(owned?'Equip '+item.label:'Buy '+item.label,()=>owned?this.api.perform('equip',{key:item.key}):this.api.confirm('Buy '+item.label+'?',`${fmt(price)} DIG. Permanent cosmetic only; no actions or NFT bonus. Allocation: 90% DIG reward pool, 5% Oso, 5% Bebe.`,()=>this.api.perform('buyCosmetic',{key:item.key})));b.dataset.shopPurchase=item.key;b.disabled=s.equipped===item.key;this.detail.append(b);}
  if(item.kind==='nft'){const spec=NFT_TYPES[item.key];this.detail.append(el('p',`${spec.cap} fixed editions · permanent +${spec.bonusBps/100}% ${spec.currencies.join('/')} regular rewards · $${(spec.usdCents/100).toFixed(2)} USD mint. Payment: ${spec.currencies.join(' + ')}. Transferable independent collection; only one equipped. Simulated minting only.`),this.button('View '+item.key+' NFT mint, ownership and equipment',()=>{const details=document.getElementById('mythic-nfts');details.open=true;details.scrollIntoView({block:'start'});document.querySelector('.nft-card[data-nft-type="'+item.key+'"]')?.scrollIntoView({block:'center'});}));}
  if(item.kind==='pickaxe'){
   const index=this.api.getSelected(),cell=s.board[index],family=item.family,tier=item.tier;
   this.detail.append(el('p','Select a discovered '+tier+' block on the mining board before purchasing. This pickaxe resolves that block once; it is not a stored unlimited tool. Metal rewards receive no Mythic shovel bonus.'));
   for(const currency of family==='DIG'?['DIG']:[family,'DIG']){const price=family==='DIG'?PICKAXE_PRICE[tier]:currency==='DIG'?DIG_ALTERNATIVES[family][tier]:NATIVE_PRICES[family][tier],quoteBlocked=family==='NOMO'&&currency==='DIG'&&!s.quoteReady;
    const b=this.button(`${fmt(price)} ${currency} · resolve ${family} ${tier}`,()=>this.api.confirm('Use '+item.label+'?',`${fmt(price)} ${currency}. Resolves the selected ${tier} block for ${family} rewards under its current yield and funding protections. No profit guarantee. Fees fund only ${currency}; no automatic conversion.`,()=>this.api.perform('pickaxe',{index,family,currency})));
    b.dataset.shopPurchase=item.key+'-'+currency;b.disabled=!cell||cell.state!=='metal'||cell.kind!==tier||quoteBlocked;this.detail.append(b);if(quoteBlocked)this.detail.append(el('p','DIG-paid NOMO quote unavailable: approved reference-liquidity guard is not connected. No charge can be made.','hint'));
   }
   this.detail.append(this.button('Choose a mining target',()=>document.getElementById('shop-panel').close()));
  }
  if(item.kind==='bulk'){
   const data=item.key==='smallCharge'?{indices:this.api.getChargeTargets()}:{index:this.api.getSelected()},price={dynamite:'0.05 NOMO',drill:'45,000 DIG',smallCharge:'13,500 DIG'}[item.key],description={dynamite:'Two adjacent rows, ten positions. Choose a position above the bottom row.',drill:'One column, ten positions. Choose a position in the intended column.',smallCharge:'Three orthogonally connected positions. Enable Charge selection and choose all three.'}[item.key];
   this.detail.append(el('p',`${price} · ${description} Purchase includes its excavation actions; stored/free shovels are not consumed. Every target must be covered. Metal still needs a pickaxe. The whole transaction rolls back if any target or settlement fails.`));
   let valid=false;try{const targets=bulkTargets(item.key,data);valid=targets.length===(item.key==='smallCharge'?3:10)&&targets.every(i=>s.board[i].state==='covered');if(item.key==='smallCharge'){const reached=new Set(targets.slice(0,1));let expanded=true;while(expanded){expanded=false;for(const i of targets)if(!reached.has(i)&&[...reached].some(j=>Math.abs(Math.floor(i/5)-Math.floor(j/5))+Math.abs(i%5-j%5)===1)){reached.add(i);expanded=true;}}valid=valid&&reached.size===3;}}catch{}
   const choose=this.button('Choose tool targets on the board',()=>{if(item.key==='smallCharge'){const mode=document.getElementById('charge-mode');if(!mode.checked){mode.checked=true;mode.dispatchEvent(new Event('change'));}}document.getElementById('shop-panel').close();});
   const use=this.button('Confirm '+item.label+' · '+price,()=>this.api.requestBulk(item.key,data));use.dataset.shopPurchase=item.key;use.disabled=!valid;this.detail.append(choose,use);
  }
  if(item.kind==='depth'){
   this.detail.append(el('p','10,000 DIG · unlocks early descent for this depth. Buying does not descend or play a cutscene. Confirm Descend on the mining board when ready; that closes the depth permanently. A used early pass is shown before the approved-card tunnel.'));
   const b=this.button('Buy early Depth Pass · 10,000 DIG',()=>this.api.confirm('Buy early Depth Pass?','10,000 DIG to unlock early descent. This purchase does not change depth or start a cutscene. Confirm descent separately; remaining covered blocks and unresolved metal are abandoned when you descend.',()=>this.api.perform('depthPass')));b.dataset.shopPurchase=item.key;b.disabled=s.earlyDescent||resolved(s)>=35;this.detail.append(b,this.button('Return to mine to descend',()=>document.getElementById('shop-panel').close()));
  }
 }
 wallets(){this.detail.replaceChildren(el('h3','Simulated wallet connection'),el('p','Real NOMO Supply wallet integration is not connected. These linked test wallets share one local profile.'));const s=this.api.getGame();for(const w of s.account.wallets){const b=this.button(w.id,()=>this.api.perform('selectWallet',{walletId:w.id}));b.disabled=w.id===s.account.receivingWallet;this.detail.append(b);}const label=el('label','New simulated wallet name'),input=el('input');input.id='shop-wallet-name';input.maxLength=40;label.htmlFor=input.id;this.detail.append(label,input,this.button('Link simulated wallet',()=>{const walletId=input.value.trim();if(walletId)this.api.perform('linkWallet',{walletId}).then(()=>this.wallets());}));}
 refresh(){const s=this.api.getGame();this.notice.textContent=`Simulated wallet: ${s.account.receivingWallet} · DIG ${fmt(s.wallet)} · NOMO ${fmt(balance(s,'NOMO'))} · FENN ${fmt(balance(s,'FENN'))} · ${s.shovels} digging actions · ${s.nftEquipped?'Mythic equipped':'No Mythic equipped'}`;
  for(const [i,token] of ['DIG','NOMO','FENN'].entries()){let value=this.hotspots.querySelector('[data-shop-balance="'+token+'"]');if(!value&&this.screens[this.screen]){value=el('span',undefined,'shop-art-balance');value.dataset.shopBalance=token;Object.assign(value.style,{left:(792+i*177)/12.8+'%',top:56/8.53+'%',width:108/12.8+'%',height:32/8.53+'%'});this.hotspots.append(value);}if(value)value.textContent=fmt(balance(s,token));}
  // Keep nodes stable during idle ticks, preserving focus and mobile scroll.
  if(this.selected){const index=this.api.getSelected(),key=JSON.stringify([s.cosmetics,s.equipped,s.nftEquipped,s.account.receivingWallet,index,s.board[index]?.state,s.board[index]?.kind,s.info,s.earlyDescent,s.quoteReady,this.api.getChargeTargets(),resolved(s)]);if(key!==this.detailKey){this.detailKey=key;this.renderDetail();}}
 }
}
