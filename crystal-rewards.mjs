// Durable simulated crystal settlement. Presentation never rolls reward values.
import {units,amount,SUPPLY,RULES} from './game.mjs';
import {weighted,DIG_CRYSTAL,FENN_LADDER,random} from './engine.mjs';
export function enableCrystalRewards(current){const s=structuredClone(current);s.crystalRewardsVersion=1;s.crystalReceipts??={};return s;}
export function enableFusionRewards(current){const s=enableCrystalRewards(current);s.fusionRewardsVersion=1;s.fusionQueue??=[];return s;}
function walletCredit(s,asset,value,walletId){
 const n=BigInt(value),active=walletId===s.account.receivingWallet,wallet=s.account.wallets.find(w=>w.id===walletId);if(!wallet)throw Error('Original earning wallet is unavailable; crystal right retained.');
 if(asset==='DIG'){const held=active?s.wallet:wallet.DIG,room=units(Math.max(0,RULES.cap-held)),direct=room<n?room:n;if(active)s.wallet+=amount(direct);else wallet.DIG+=amount(direct);s.profileRewards+=amount(n-direct);s.earned+=amount(n);}
 else{const b=s.native[asset],held=BigInt(active?b.wallet:wallet[asset]),cap=units(SUPPLY[asset]*.03),room=held<cap?cap-held:0n,direct=room<n?room:n;if(active)b.wallet=String(held+direct);else wallet[asset]=String(held+direct);b.profileRewards=String(BigInt(b.profileRewards)+n-direct);b.earned=String(BigInt(b.earned)+n);}
}
export function settleCrystal(s,crystal,{wallet=crystal.earningWallet||s.account.receivingWallet}={}){
 s.crystalReceipts??={};if(crystal.state==='claimed'||s.crystalReceipts[crystal.id])return false;
 const asset=crystal.asset,n=BigInt(crystal.rewardUnits??(asset==='DIG'?String(units(crystal.amount)):crystal.nativeReserve||'0'));
 if(n<=0n)throw Error('Crystal settlement provenance unavailable; owned right retained.');
 const held=asset==='DIG'?units(crystal.reserve||0):BigInt(crystal.nativeReserve||'0');
 if(asset==='DIG'){if(units(s.vault)-units(s.reserved)+held<n)throw Error('Crystal reward is not fully funded.');s.reserved-=amount(held);s.vault-=amount(n);crystal.reserve=0;}
 else{const b=s.native[asset],available=BigInt(b.vault)-BigInt(b.reserved)+held-(asset==='NOMO'?units(2):0n);if(available<n)throw Error('Native crystal reward/floor is not fully funded.');b.reserved=String(BigInt(b.reserved)-held);b.vault=String(BigInt(b.vault)-n);crystal.nativeReserve='0';}
 walletCredit(s,asset,n,wallet);crystal.state='claimed';crystal.rewardUnits=String(n);
 s.crystalReceipts[crystal.id]={id:crystal.id,asset,units:String(n),wallet,origin:crystal.origin,bonusUnits:'0',status:'credited'};
 s.history.unshift({text:`${asset} ${asset==='DIG'?'Emerald':asset==='FENN'?'Ruby':'Diamond'} crystal: +${amount(n).toLocaleString('en-US',{maximumFractionDigits:12})} ${asset} credited. No Mythic bonus on crystals.`});return true;
}
export function settleDirectDiscovery(s,cell){if(s.crystalRewardsVersion!==1||cell.kind!=='crystal')return;const crystal=s.crystals.find(x=>x.id===`${s.depth}:${cell.index}`&&x.origin==='whole');if(!crystal)return;crystal.earningWallet=s.account.receivingWallet;settleCrystal(s,crystal);}
export function recoverDirectCrystals(s){if(s.crystalRewardsVersion!==1)return;for(const c of s.crystals)if(c.origin==='whole'&&c.state==='owned'&&(c.asset==='DIG'&&c.amount>0||BigInt(c.nativeReserve||'0')>0n))settleCrystal(s,c);}
export function prepareFusions(s,rng=random){if(s.fusionRewardsVersion!==1)return;s.fusionQueue??=[];
 for(const asset of ['DIG','FENN'])while(s.shards[asset].length>=10){const shards=s.shards[asset].splice(0,10),id=`fusion:${asset}:${s.transactions.length}:${s.crystals.length}`;s.crystals.push({id,asset,origin:'shards',shards,reserve:shards.reduce((n,x)=>n+(x.reserve||0),0),nativeReserve:String(shards.reduce((n,x)=>n+BigInt(x.nativeReserve||'0'),0n)),state:'owned',version:s.version});}
 for(const c of s.crystals){if(c.origin!=='shards'||c.state!=='owned'||c.rewardUnits||s.crystalReceipts?.[c.id])continue;
  if(!['DIG','FENN'].includes(c.asset)||c.shards?.length!==10||c.shards.some(x=>x.version!==RULES.version||typeof x.covered!=='boolean')){c.settlementHold='Historical shard provenance needs verification; rights preserved.';continue;}
  const covered=c.shards.filter(x=>x.covered).length,currentDig=c.asset==='DIG'&&c.shards.at(-1).economyVersion===RULES.economyVersion;
  if(c.asset==='DIG'&&!currentDig&&covered!==0&&covered!==10){c.settlementHold='Mixed covered/uncovered DIG shard payout awaits explicit approval; ten shards and reservations retained in this crystal.';continue;}
  const rate=c.asset==='DIG'?(currentDig?(c.shards.at(-1).covered?100:75):(covered===10?90:75)):s.controllers.FENN.rate;
  const nominal=c.nominal??weighted(c.asset==='DIG'?DIG_CRYSTAL:FENN_LADDER,rng);c.nominal=nominal;c.settlementRate??=rate;const due=units(nominal)*BigInt(c.settlementRate)/100n;
  c.earningWallet??=s.account.receivingWallet;
  const held=c.asset==='DIG'?units(c.reserve||0):BigInt(c.nativeReserve||'0');
  if(held<due&&(!currentDig||units(s.vault)-units(s.reserved)<due-held)){c.settlementHold=currentDig?'DIG crystal completion top-up is not fully funded; fixed reward and rights preserved.':'Historical shard funding evidence unavailable; rights preserved.';continue;}
  c.nominal=nominal;c.rate=c.settlementRate;c.rewardUnits=String(due);delete c.settlementHold;
  if(c.asset==='DIG'){s.reserved-=amount(held-due);c.reserve=amount(due);c.amount=amount(due);}else{s.native.FENN.reserved=String(BigInt(s.native.FENN.reserved)-(held-due));c.nativeReserve=String(due);c.nativeNominal=nominal;}
  s.fusionQueue.push({id:c.id,asset:c.asset,units:String(due),wallet:c.earningWallet,status:'pending',bonusUnits:'0'});
 }
}
export function finalizeFusion(s,id){const pending=s.fusionQueue?.find(x=>x.id===id),c=s.crystals.find(x=>x.id===id);if(!pending){if(s.crystalReceipts?.[id])return false;throw Error('Pending crystal reward not found.');}if(!c||c.rewardUnits!==pending.units||c.earningWallet!==pending.wallet)throw Error('Fusion entitlement mismatch; original right retained.');settleCrystal(s,c,{wallet:pending.wallet});s.fusionQueue=s.fusionQueue.filter(x=>x.id!==id);return true;}
