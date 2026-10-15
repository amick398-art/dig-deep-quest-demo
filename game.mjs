import {scanCrystals} from './crystal-finder.mjs?v=nomo-finder-20261014';
import {refreshNativeForecast,recordMetalSelection} from './pool-automation.mjs';
// C29 simulated gameplay extensions. The recovered engine.mjs remains immutable.
import * as base from './dig-engine.mjs';
export const { RULES, publicBoard, resolved, spendable, PICKAXE_PRICE } = base;
export const SUPPLY={DIG:1_000_000_000,FENN:1_000_000_000_000,NOMO:10_000};
export const COSMETICS={basic:0,copper:1000,bronze:2000,iron:2500,silver:5000,gold:10000,platinum:25000,crystal:30000,obsidian:35000,void:40000,diamond:50000,shadow_forge:50000};
export const PLATES={silver:1000,gold:2000,platinum:5000,DIG:6000,FENN:6000,NOMO:6000};
export const MYTHICS={DIG:{DIG:100000},FENN:{FENN:500000000},NOMO:{NOMO:0.10},Oso:{DIG:200000,FENN:500000000,NOMO:0.10},Bebe:{DIG:200000,FENN:500000000,NOMO:0.10}};
export const RECHARGE={DIG:20000,FENN:100000000,NOMO:0.02};
export const NATIVE_PRICES={FENN:{copper:10000000,silver:16500000,gold:31200000,platinum:61600000},NOMO:{copper:0.102,silver:0.102,gold:0.116,platinum:0.167}};
export const DIG_ALTERNATIVES={FENN:{copper:4500,silver:4500,gold:6500,platinum:12500},NOMO:{copper:125000,silver:125000,gold:145000,platinum:205000}};
export const NOMO_CRYSTAL=[[0.025,140],[0.05,120],[0.1,80],[0.15,40],[0.175,16],[0.2,4]];
const SCALE=1000000000000n; // Explicit demo precision; live contract precision remains external.
export function units(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Invalid token amount.');const [whole,fraction]=value.toFixed(12).split('.');return BigInt(whole)*SCALE+BigInt(fraction);}
export const amount = value => Number(BigInt(value))/1e12;
const percent=(value,bp)=>units(value)*BigInt(bp)/10000n;
const fields=['wallet','profileRewards','earned','vault','reserved','treasury','burn','liquidity','oso','bebe'];
function book(wallet,vault){return Object.fromEntries(fields.map(k=>[k,String(units(k==='wallet'?wallet:k==='vault'?vault:0))]));}
function add(b,k,n){const next=BigInt(b[k])+n;if(next<0n)throw Error('Token ledger would become negative.');b[k]=String(next);}
export function balance(s,asset,field='wallet'){
 if(asset==='DIG')return field==='vault'?s.vault:field==='reserved'?s.reserved:field==='treasury'?s.treasury:field==='profileRewards'?s.profileRewards:field==='earned'?s.earned:s.wallet;
 return amount(s.native[asset][field]);
}
export function nativeSpendable(s,asset){const b=s.native[asset];return amount(BigInt(b.vault)-BigInt(b.reserved));}
function note(s,text){s.history.unshift({text});s.history=s.history.slice(0,100);}
function enrichBoard(s,rng){
 for(const c of s.board){
  if(base.METALS.includes(c.kind)&&!c.nativeNominals){
   const minimum={FENN:{copper:5e6,silver:10e6,gold:20e6,platinum:40e6},NOMO:{copper:0.01,silver:0.025,gold:0.05,platinum:0.10}};
   c.nativeNominals={};
   for(const asset of ['FENN','NOMO']){const ladder=asset==='FENN'?base.FENN_LADDER:base.NOMO_LADDER;const m=minimum[asset][c.kind];const table=ladder.filter(r=>r[0]>=m).map(r=>[...r]);table[0][1]+=ladder.filter(r=>r[0]<m).reduce((n,r)=>n+r[1],0);c.nativeNominals[asset]=base.weighted(table,rng);}
  }
  if(c.kind==='crystal'&&c.asset!=='DIG'&&c.nominal===undefined)c.nominal=base.weighted(c.asset==='FENN'?base.FENN_LADDER:NOMO_CRYSTAL,rng);
 }
}
export function restoreGame(current,rng=base.random){
 const s=base.migrateDigEconomy(structuredClone(current));
 if(!s.native){
  s.native={FENN:book(1000000000,13000000000),NOMO:book(1,20)};
  s.controllers={FENN:{rate:100,paused:false,runway:null},NOMO:{rate:100,paused:false,runway:null,restartLiability:null}};
  s.freeShovels=0;s.storedShovels=s.shovels;
  s.cosmetics=['basic'];s.mythics={};s.equipped='basic';s.releaseStock={Oso:100,Bebe:100};
  s.account={id:'local-supply-profile',eligible:true,receivingWallet:'demo-wallet',designatedWallet:'demo-wallet',wallets:[{id:'demo-wallet',DIG:s.wallet,FENN:s.native.FENN.wallet,NOMO:s.native.NOMO.wallet}]};
  s.heldEquipment=[];s.quoteReady=false;s.extensionVersion=1;
 }
 s.plates??=[];s.equippedPlate??=null;
 enrichBoard(s,rng);return s;
}
export function createGame(rng=base.random){return restoreGame(base.createGame(rng),rng);}
function syncShovels(s){s.shovels=s.freeShovels+s.storedShovels;}
function pay(s,asset,price,kind='ordinary',allowance=false){
 if(!Object.hasOwn(SUPPLY,asset)||!Number.isFinite(price)||price<=0)throw Error('Invalid purchase.');
 const ratios=kind==='cosmetic'?[9000,0,0,0,500,500]:kind==='premium'?[6500,1000,1000,0,750,750]:[6500,1000,1000,500,500,500];
 const parts=ratios.map(bp=>percent(price,bp));
 if(parts.reduce((a,b)=>a+b,0n)!==units(price))throw Error('Unsupported payment precision.');
 if(asset==='DIG'){
  if(s.wallet<price)throw Error('Insufficient simulated DIG.');s.wallet-=price;
  s.vault+=amount(parts[0]);s.buckets.burn+=amount(parts[1]);s.buckets.liquidity+=amount(parts[2]);s.treasury+=amount(parts[3]);s.buckets.oso+=amount(parts[4]);s.buckets.bebe+=amount(parts[5]);
  if(allowance)s.reserved+=amount(percent(price,3500));
 }else{
  const b=s.native[asset];add(b,'wallet',-units(price));
  for(const [i,k] of ['vault','burn','liquidity','treasury','oso','bebe'].entries())add(b,k,parts[i]);
  if(allowance)add(b,'reserved',percent(price,3500));
 }
}
function routeNative(s,asset,payout,held=0n){
 const b=s.native[asset],n=BigInt(payout),reserve=BigInt(held);
 if(s.controllers[asset].paused)throw Error('Native pool paused; owned rights remain held.');
 if(BigInt(b.vault)-(BigInt(b.reserved)-reserve)<n)throw Error('Native settlement is not fully funded.');
 if(asset==='NOMO'&&BigInt(b.vault)-n<BigInt(b.reserved)-reserve+units(2))throw Error('NOMO floor protection: settlement unavailable.');
 add(b,'reserved',-reserve);add(b,'vault',-n);
 const room=units(SUPPLY[asset]*0.03)-BigInt(b.wallet),direct=room>0n?(room<n?room:n):0n;
 add(b,'wallet',direct);add(b,'profileRewards',n-direct);add(b,'earned',n);
}
function extra(s,asset,payable,covered=false){
 const m=s.mythics[s.equipped];
 if(!m||!m.allowances[asset]||asset==='DIG'&&covered)return 0n;
 const bp=['Oso','Bebe'].includes(m.brand||s.equipped)?1500:1000;
 const wanted=BigInt(payable)*BigInt(bp)/10000n,available=BigInt(m.allowances[asset]);
 const n=wanted<available?wanted:available;m.allowances[asset]=String(available-n);return n;
}
function awardDigExtra(s,c){
 if(c.kind!=='DIG')return;
 const n=extra(s,'DIG',percent(c.nominal,c.rate*100),c.covered);if(!n)return;
 const value=amount(n);s.reserved-=value;s.vault-=value;
 const direct=Math.min(value,Math.max(0,RULES.cap-s.wallet));s.wallet+=direct;s.profileRewards+=value-direct;s.earned+=value;
 note(s,`${s.equipped} allowance paid ${value.toLocaleString()} extra simulated DIG.`);
}
function finishDiscovery(s,c,rng){
 awardDigExtra(s,c);
 if(['FENN','NOMO'].includes(c.kind)){
  const asset=c.kind,n=percent(c.nominal,s.controllers[asset].rate*100),bonus=extra(s,asset,n);
  routeNative(s,asset,n+bonus,bonus);
  s.supplemental=s.supplemental.filter(x=>x.id!==`${s.depth}:${c.index}`);
  note(s,`${amount(n+bonus).toLocaleString('en-US',{maximumFractionDigits:6})} simulated ${asset} settled.`);
 }
 if(c.kind==='crystal'&&c.asset!=='DIG'){
  const crystal=s.crystals.at(-1),n=percent(c.nominal,s.controllers[c.asset].rate*100),b=s.native[c.asset];
  if(BigInt(b.vault)-BigInt(b.reserved)<n)throw Error('Crystal obligation is not fully funded.');
  add(b,'reserved',n);crystal.nativeNominal=c.nominal;crystal.nativeReserve=String(n);
 }
 if(c.kind==='shard'&&c.asset==='FENN'){
  // Hold the known worst-case native share without guessing a settlement yield.
  // Ten FENN shards form a crystal; its largest nominal reward is 80M FENN.
  const b=s.native.FENN,n=units(8000000);
  if(BigInt(b.vault)-BigInt(b.reserved)<n)throw Error('Native shard right cannot be fully reserved. No changes made.');
  add(b,'reserved',n);
  const formed=s.crystals.find(x=>x.id===`shards:${s.depth}:${c.index}`),shard=formed?formed.shards.at(-1):s.shards.FENN.at(-1);
  shard.nativeReserve=String(n);
  if(formed)formed.nativeReserve=String(formed.shards.reduce((sum,x)=>sum+BigInt(x.nativeReserve||'0'),0n));
  note(s,'FENN shard retained with protected native reserve. Shard-formed settlement awaits the inherited policy.');
 }
}
export function bulkTargets(kind,selection){
 const index=selection.index;
 if(kind==='smallCharge')return [...new Set(selection.indices||[])].sort((a,b)=>a-b);
 if(!Number.isInteger(index)||index<0||index>=50)throw Error('Select a board position.');
 const row=Math.floor(index/5),col=index%5;
 if(kind==='powerStrike'){if(row>=9||col>=4)throw Error('Select the upper-left corner of a 2×2 area.');return [index,index+1,index+5,index+6];}
 if(kind==='drill')return Array.from({length:10},(_,r)=>r*5+col);
 if(kind==='dynamite'){if(row>=9)throw Error('Select the first of two adjacent rows.');return Array.from({length:10},(_,i)=>row*5+i);}
 throw Error('Unknown bulk tool.');
}
function validateBulk(s,kind,indices){
 const needed={smallCharge:3,powerStrike:4,drill:10,dynamite:10}[kind];
 if(indices.length!==needed||indices.some(i=>!Number.isInteger(i)||i<0||i>=50||s.board[i].state!=='covered'))throw Error('Every target must be a covered or lit, unexcavated position. No charge made.');
 if(kind==='smallCharge'){
  const visited=new Set([indices[0]]);let changed=true;
  while(changed){changed=false;for(const i of indices)if(!visited.has(i)&&[...visited].some(j=>Math.abs(i-j)===5||Math.floor(i/5)===Math.floor(j/5)&&Math.abs(i-j)===1)){visited.add(i);changed=true;}}
  if(visited.size!==3)throw Error('Small Charge requires three orthogonally connected positions.');
 }
}
export function evaluateNative(s,asset){
 if(s.poolAutomationVersion===1)refreshNativeForecast(s);
 const c=s.controllers[asset],available=BigInt(s.native[asset].vault)-BigInt(s.native[asset].reserved),rates=[100,75,50,25,10];
 if(asset==='FENN'&&available<percent(80000000,c.rate*100)||asset==='NOMO'&&available<units(2))c.paused=true;
 // Runway must come from the authoritative native-liability estimator, not an invented denominator.
 if(!c.runway)return;
 // Safety always rechecks; at most one yield transition per atomic settlement event.
 if(s.poolAutomationVersion===1&&s.poolEvent&&c.lastTransitionEvent===s.poolEvent)return;
 const beforeRate=c.rate,beforePaused=c.paused;
 const index=rates.indexOf(c.rate),down=[12500,10000,5000,2500],recovery=[16000,13500,8500,6000];
 if(c.paused){
  if(asset==='FENN'&&c.runway[25]>=6000&&available>=units(20000000)){c.rate=25;c.paused=false;}
  if(asset==='NOMO'&&Number.isFinite(c.restartLiability)&&c.restartLiability>=0&&available>=units(2)+units(c.restartLiability))c.paused=false;
  if(s.poolAutomationVersion===1&&(c.rate!==beforeRate||c.paused!==beforePaused))c.lastTransitionEvent=s.poolEvent;
  return;
 }
 if(index<4&&c.runway[c.rate]<down[index])c.rate=rates[index+1];
 else if(index>0&&c.runway[rates[index-1]]>=recovery[index-1])c.rate=rates[index-1];
 if(s.poolAutomationVersion===1&&c.rate!==beforeRate)c.lastTransitionEvent=s.poolEvent;
}
function assertLedger(s){
 if(s.wallet<0||s.reserved<0||s.vault<s.reserved||s.pass.remaining<0||s.freeShovels<0||s.storedShovels<0)throw Error('DIG accounting invariant failed.');
 for(const asset of ['FENN','NOMO']){const b=s.native[asset];if(fields.some(k=>BigInt(b[k])<0n)||BigInt(b.vault)<BigInt(b.reserved))throw Error('Native accounting invariant failed.');}
}
export function act(current,action,{now=Date.now(),rng=base.random,afterRegularReward,approvedShadowForge=false,finderDemoRates=null}={}){
 if(!action.id||typeof action.id!=='string')throw Error('A unique transaction ID is required.');
 if(current.transactions.includes(action.id))return current;
 // Owner clarification: reject foreign payment/pool labels before any controller or ledger mutation.
 if(action.type==='buyPass'&&['currency','paymentCurrency','asset','family','pool','rewardPool'].some(key=>action[key]!==undefined&&action[key]!=='DIG'))throw Error('DIG Boost Passes require DIG payment and the DIG reward pool. No charge made.');
 if(action.expectedDepth!==undefined&&action.expectedDepth!==current.depth)throw Error('Depth changed while this action was open. Review the target again; no charge made.');
 if(action.expectedWallet!==undefined&&action.expectedWallet!==(current.account?.receivingWallet||'demo-wallet'))throw Error('Receiving wallet changed. Review checkout again; no charge made.');
 let s=restoreGame(current,rng);syncShovels(s);if(s.poolAutomationVersion===1)s.poolEvent=action.id;
 for(const a of ['FENN','NOMO'])evaluateNative(s,a);
 const inherited=['tick','buyShovels','buyPass','dig','light','detector','scanner','depthPass','descend','deposit'];
 if(action.type==='deposit'&&action.asset&&action.asset!=='DIG'){
  if(!Object.hasOwn(s.native,action.asset))throw Error('Unknown native asset.');
  const n=units(action.amount);if(n<=0n)throw Error('Invalid native deposit.');add(s.native[action.asset],'vault',n);note(s,`100% native ${action.asset} fixture deposit credited; no withdrawal API.`);
 }else if(action.type==='free'){
  const wallet=s.account.designatedWallet===s.account.receivingWallet?s.wallet:s.account.wallets.find(w=>w.id===s.account.designatedWallet)?.DIG;
  if(!s.account.eligible||wallet<RULES.freeGate)throw Error('Eligible profile must hold 500,000 DIG in its designated wallet.');
  if(s.lastFreeClaim!==null&&now-s.lastFreeClaim<RULES.freeInterval)throw Error('Daily pair available after 24 hours.');
  s.freeShovels=2;s.lastFreeClaim=now;note(s,'Daily free balance refilled to two; unused daily actions do not stack.');
 }else if(action.type==='pickaxe'&&action.family&&action.family!=='DIG'){
  const c=s.board[action.index],asset=action.family,currency=action.currency||asset;
  if(!c||c.state!=='metal'||!NATIVE_PRICES[asset]||!c.nativeNominals)throw Error('Select excavated metal and a supported native family.');
  if(s.controllers[asset].paused)throw Error('Selected reward pool is paused.');
  if(currency!=='DIG'&&currency!==asset)throw Error('Unsupported payment currency.');
  if(asset==='NOMO'&&currency==='DIG'&&!s.quoteReady)throw Error('NOMO reference-liquidity guard is unavailable. No charge made.');
  pay(s,currency,currency==='DIG'?DIG_ALTERNATIVES[asset][c.kind]:NATIVE_PRICES[asset][c.kind]);
  const n=percent(c.nativeNominals[asset],s.controllers[asset].rate*100);routeNative(s,asset,n);
  s.reserved-=c.reserve;c.reserve=0;c.state='resolved';note(s,`Metal settled in ${asset}; payment allocation stayed in ${currency}.`);
 }else if(action.type==='pickaxe'){
  if(action.currency&&action.currency!=='DIG')throw Error('DIG-family pickaxes require DIG payment. No charge made.');
  s=base.act(s,action,{now,rng});
 }
 else if(action.type==='breakCrystal'){
  const crystal=s.crystals.find(c=>c.id===action.crystalId);
  if(!crystal||crystal.state!=='owned')throw Error('Choose an owned crystal.');
  if(crystal.asset==='DIG')s=base.act(s,action,{now,rng});
  else{if(!crystal.nativeNominal)throw Error('Historical or shard crystal held pending its settlement policy.');const n=percent(crystal.nativeNominal,s.controllers[crystal.asset].rate*100);routeNative(s,crystal.asset,n,BigInt(crystal.nativeReserve));crystal.nativeReserve='0';crystal.state='claimed';note(s,'Owned native crystal settled once.');}
 }else if(action.type==='claimRewards'&&action.asset&&action.asset!=='DIG'){
  const b=s.native[action.asset];if(!b)throw Error('Unknown asset.');
  const room=units(SUPPLY[action.asset]*0.03)-BigInt(b.wallet),pending=BigInt(b.profileRewards),n=room<pending?room:pending;
  if(n<=0n)throw Error('No claimable rewards within wallet headroom.');add(b,'wallet',n);add(b,'profileRewards',-n);note(s,`Claimed simulated ${action.asset} profile Rewards.`);
 }else if(action.type==='claimRewards')s=base.act(s,action,{now,rng});
 else if(action.type==='bulk'){
  const indices=bulkTargets(action.kind,action);validateBulk(s,action.kind,indices);
  pay(s,action.kind==='dynamite'?'NOMO':'DIG',{smallCharge:13500,powerStrike:18000,drill:45000,dynamite:0.05}[action.kind]);
  for(const index of indices){if(s.poolAutomationVersion===1){s.poolEvent=`${action.id}:cell:${index}`;for(const a of ['FENN','NOMO'])evaluateNative(s,a);}base.updateBoost(s,now);s.shovels++;s=base.act(s,{type:'dig',index,id:`${action.id}:cell:${index}`},{now,rng});finishDiscovery(s,s.board[index],rng);afterRegularReward?.(s,s.board[index]);if(s.board[index].kind==='shovel')s.storedShovels++;syncShovels(s);for(const a of ['FENN','NOMO'])evaluateNative(s,a);}
  note(s,`${action.kind}: ${indices.length} positions excavated in row-major order.`);
 }else if(action.type==='buyCosmetic'){
  if(action.key==='shadow_forge'&&!approvedShadowForge)throw Error('Shadow Forge release requires approved artwork.');
  if(!Object.hasOwn(COSMETICS,action.key)||s.cosmetics.includes(action.key))throw Error('Cosmetic unavailable or already owned.');
  pay(s,'DIG',COSMETICS[action.key],'cosmetic');s.cosmetics.push(action.key);note(s,'Permanent cosmetic owned; no gameplay bonus.');
 }else if(action.type==='buyPlate'){
  if(!Object.hasOwn(PLATES,action.key)||s.plates.includes(action.key))throw Error('Plate unavailable or already owned.');
  pay(s,'DIG',PLATES[action.key],'cosmetic');s.plates.push(action.key);note(s,'Permanent decorative plate owned; no gameplay or reward effect.');
 }else if(action.type==='equipPlate'){
  if(action.key!==null&&!s.plates.includes(action.key))throw Error('Choose an owned decorative plate.');
  s.equippedPlate=action.key;note(s,'Decorative plate changed; equipment bonuses unchanged.');
 }else if(action.type==='buyMythic'){
  const prices=MYTHICS[action.key];if(!Object.hasOwn(MYTHICS,action.key)||!s.account.eligible)throw Error('Mythic unavailable for this profile.');
  const premium=['Oso','Bebe'].includes(action.key);if(premium&&(s.mythics[action.key]||s.releaseStock[action.key]<=0))throw Error('First release unavailable: one of each per eligible profile.');
  const allowances={};for(const [asset,price] of Object.entries(prices)){pay(s,asset,price,premium?'premium':'ordinary',true);allowances[asset]=String(percent(price,3500));}
  const instance=s.mythics[action.key]?`${action.key}:${s.transactions.length}`:action.key;
  s.mythics[instance]={brand:action.key,allowances,ownedAt:now};if(premium)s.releaseStock[action.key]--;note(s,`Owned ${instance}; separate finite native bonus allowances reserved. No digging actions granted.`);
 }else if(action.type==='equip'){
  if(!s.cosmetics.includes(action.key)&&!s.mythics[action.key])throw Error('Equip an owned shovel.');s.equipped=action.key;note(s,`Equipped ${action.key}; one shovel at a time.`);
 }else if(action.type==='recharge'){
  const m=s.mythics[action.key],asset=action.asset;if(!m||!Object.hasOwn(m.allowances,asset))throw Error('Recharge requires an owned compatible shovel.');
  pay(s,asset,RECHARGE[asset],['Oso','Bebe'].includes(m.brand||action.key)?'premium':'ordinary',true);m.allowances[asset]=String(BigInt(m.allowances[asset])+percent(RECHARGE[asset],3500));note(s,`Optional ${asset} allowance recharged for ${action.key}; no new stock or actions.`);
 }else if(action.type==='finder'){
  if(s.info.finder)throw Error('Finder information already persists for this depth.');
  const result=scanCrystals(s.board,finderDemoRates);
  pay(s,'DIG',2750);s.info.finder=result;note(s,result.status==='none'?'NO CRYSTALS DETECTED':`${result.status==='multiple'?'MULTIPLE CRYSTALS ARE PRESENT · highest simulated USD value:':'One'} ${result.asset} crystal: row ${Math.floor(result.index/5)+1}, column ${result.index%5+1}.`);
 }else if(action.type==='linkWallet'){
  if(s.account.wallets.length>=10||!action.walletId||s.account.wallets.some(w=>w.id===action.walletId))throw Error('Link at most ten distinct simulated wallets.');
  s.account.wallets.push({id:action.walletId,DIG:0,FENN:'0',NOMO:'0'});note(s,'Linked simulated wallet; no additional account entitlement.');
 }else if(action.type==='selectWallet'){
  const next=s.account.wallets.find(w=>w.id===action.walletId);if(!next)throw Error('Choose a linked wallet.');
  const old=s.account.wallets.find(w=>w.id===s.account.receivingWallet);old.DIG=s.wallet;old.FENN=s.native.FENN.wallet;old.NOMO=s.native.NOMO.wallet;
  s.account.receivingWallet=next.id;s.wallet=next.DIG;s.native.FENN.wallet=next.FENN;s.native.NOMO.wallet=next.NOMO;note(s,'Changed simulated reward destination; profile rights and daily entitlement unchanged.');
 }else if(action.type==='switchEquipment'){
  const item=s.heldEquipment.find(i=>i.id===action.itemId),destination=action.destination;
  if(!item||!item.equivalents?.includes(destination)||destination!=='DIG'&&!Object.hasOwn(NATIVE_PRICES,destination)||!Object.hasOwn(NATIVE_PRICES,item.family)||!s.controllers[item.family].paused||destination!=='DIG'&&s.controllers[destination].paused)throw Error('Only an owned paused-pool item with an established active equivalent can switch.');
  const price=destination==='DIG'?PICKAXE_PRICE[item.tier]:NATIVE_PRICES[destination][item.tier],fee=percent(price,500);
  if(destination==='DIG'){const value=amount(fee);if(s.wallet<value)throw Error('Insufficient DIG switching fee.');s.wallet-=value;s.vault+=value;}
  else{add(s.native[destination],'wallet',-fee);add(s.native[destination],'vault',fee);}
  item.history=[...(item.history||[]),{from:item.family,to:destination,fee:String(fee),time:now}];item.family=destination;note(s,'Voluntary item switch: 100% native fee credited to destination vault. Earned rewards unchanged.');
 }else if(inherited.includes(action.type)){
  const oldFree=s.freeShovels;
  s=base.act(s,action,{now,rng});
  if(action.type==='buyShovels')s.storedShovels+=action.count;
  if(action.type==='dig'){if(oldFree>0)s.freeShovels--;else s.storedShovels--;if(s.board[action.index].kind==='shovel')s.storedShovels++;finishDiscovery(s,s.board[action.index],rng);afterRegularReward?.(s,s.board[action.index]);}
  if(action.type==='descend')enrichBoard(s,rng);
 }else throw Error('Unknown demo action.');
 if(action.type==='pickaxe'&&s.poolAutomationVersion===1)recordMetalSelection(s,{id:action.id,family:action.family||'DIG',tier:current.board[action.index].kind});
 syncShovels(s);base.updateBoost(s,now);for(const a of ['FENN','NOMO'])evaluateNative(s,a);
 if(s.poolAutomationVersion===1)refreshNativeForecast(s);
 if(!s.transactions.includes(action.id))s.transactions.push(action.id);
 assertLedger(s);return s;
}
