// Durable simulated crystal settlement. Presentation never rolls reward values.
import {units,amount,SUPPLY,RULES} from './game.mjs';
export function enableCrystalRewards(current){const s=structuredClone(current);s.crystalRewardsVersion=1;s.crystalReceipts??={};return s;}
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
