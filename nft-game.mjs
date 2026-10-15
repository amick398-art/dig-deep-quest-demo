// Current NFT-aware simulation. Verified production benefits must run behind server authority.
import {earnedSnapshot,discoveryReceipt} from './reward-reveal.mjs';
import * as legacy from './game.mjs?v=nomo-finder-20261014';
import {getEdition,bonusPlan,mintAllocation} from './mythic-nft.mjs';
import {refreshNativeForecast} from './pool-automation.mjs';
export function enablePoolAutomation(current){const s=structuredClone(current);s.poolAutomationVersion=1;s.metalSelections??=[];return refreshNativeForecast(s);}
export const {RULES,publicBoard,resolved,spendable,PICKAXE_PRICE,balance,nativeSpendable,units,amount,bulkTargets,COSMETICS,PLATES,NATIVE_PRICES,DIG_ALTERNATIVES}=legacy;
const u=legacy.units,a=legacy.amount,assets=['DIG','FENN','NOMO'];
export function restoreGame(current,rng){const s=legacy.restoreGame(current,rng);s.nftVersion=1;s.nftBonusReserves??={DIG:'0',FENN:'0',NOMO:'0'};s.nftEquipped=null;
 // Preserve old paid records/reserves, but browser-only items are not NFT ownership proof.
 if(s.mythics[s.equipped])s.equipped='basic';return s;}
export function createGame(rng){return restoreGame(legacy.createGame(rng),rng);}
function credit(s,asset,n){if(asset==='DIG'){const room=u(Math.max(0,RULES.cap-s.wallet)),direct=room<n?room:n;s.wallet+=a(direct);s.profileRewards+=a(n-direct);s.earned+=a(n);}else{const b=s.native[asset],cap=u(legacy.SUPPLY[asset]*.03),room=cap>BigInt(b.wallet)?cap-BigInt(b.wallet):0n,direct=room<n?room:n;b.wallet=String(BigInt(b.wallet)+direct);b.profileRewards=String(BigInt(b.profileRewards)+n-direct);b.earned=String(BigInt(b.earned)+n);}}
function payBonus(s,cell,entitlement){if(!entitlement||!assets.includes(cell.kind)||cell.state!=='resolved')return;const nft=getEdition(entitlement.id),asset=cell.kind;const rate=asset==='DIG'?cell.rate:s.controllers[asset].rate;const base=u(cell.nominal)*BigInt(rate)/100n;
 const pool=asset==='DIG'?u(Math.max(0,legacy.spendable(s))):BigInt(s.native[asset].vault)-BigInt(s.native[asset].reserved)-(asset==='NOMO'?u(2):0n);
 const plan=bonusPlan({type:nft.type,asset,baseUnits:String(base),reserveUnits:s.nftBonusReserves[asset],poolSpendableUnits:String(pool>0n?pool:0n),coveredDIG:cell.covered});
 const due=BigInt(plan.due);if(!due)return;s.nftBonusReserves[asset]=String(BigInt(s.nftBonusReserves[asset])-BigInt(plan.reserveDebit));
 if(asset==='DIG')s.vault-=a(plan.poolDebit);else s.native[asset].vault=String(BigInt(s.native[asset].vault)-BigInt(plan.poolDebit));credit(s,asset,due);
 s.history.unshift({text:`${nft.type} NFT #${nft.edition}: ${a(due)} permanent ${asset} bonus; ${a(plan.reserveDebit)} reserve + ${a(plan.poolDebit)} same-token pool.`});
}
function applyMintAllocation(s,type,legs){const bps=mintAllocation(type);for(const leg of legs){const paid=BigInt(leg.amountUnits),parts={};let other=0n;for(const key of ['burn','liquidity','treasury','oso','bebe']){parts[key]=paid*BigInt(bps[key])/10000n;other+=parts[key];}parts.pool=paid-other; // Base-unit dust stays in the matching reward pool; percentages unchanged.
 for(const [field,n] of Object.entries(parts)){const key=field==='pool'?'vault':field;if(leg.asset==='DIG'){if(['oso','bebe','burn','liquidity'].includes(key))s.buckets[key]+=a(n);else s[key]+=a(n);}else s.native[leg.asset][key]=String(BigInt(s.native[leg.asset][key])+n);}
}}
export function act(current,action,{authority=null,now=Date.now(),rng,onDiscovery}={}){
 if(!action.id||typeof action.id!=='string')throw Error('A unique transaction ID is required.');if(current.transactions.includes(action.id))return current;
 if(['buyMythic','recharge'].includes(action.type))throw Error('Legacy copies and recharges are retired. Mythics require their own limited NFT mint and verified ownership.');
 const discoveries=[];
 const execute=()=>{
 let s=restoreGame(current,rng),wallet=s.account.receivingWallet;delete s.nftSandbox;
 if(action.expectedWallet!==undefined&&action.expectedWallet!==wallet||action.expectedDepth!==undefined&&action.expectedDepth!==s.depth)throw Error('Wallet or depth changed; no charge made.');
 const entitled=()=>{const proof=authority?.equipped(wallet);if(proof){getEdition(proof.id);if(proof.owner!==wallet||proof.mode!=='simulation'&&proof.verifiedOnChain!==true)throw Error('Current NFT ownership could not be verified.');}return proof||null;};
 if(action.type==='transferNFT'){if(!authority)throw Error('NFT ownership authority unavailable.');authority.transfer({id:action.nftId,from:wallet,to:action.destination});s.nftEquipped=entitled()?.id||null;s.transactions.push(action.id);return s;}
 if(action.type==='equipNFT'){
  if(!authority)throw Error('NFT ownership verification is not configured.');authority.equip(wallet,action.nftId??null);s.nftEquipped=entitled()?.id||null;s.equipped='basic';s.transactions.push(action.id);return s;
 }
 if(action.type==='mintNFT'){
  if(!authority||authority.snapshot().mode!=='simulation')throw Error('Live NFT minting is disabled; configured simulated authority required.');
  const quote=action.quote;if(!quote||quote.mode!=='simulation'||quote.legs.some(leg=>leg.decimals!==12))throw Error('Use a stored simulated quote; no live conversion is assumed.');
  const balances={DIG:String(u(s.wallet)),FENN:s.native.FENN.wallet,NOMO:s.native.NOMO.wallet};const payments=Object.fromEntries(quote.legs.map(leg=>[leg.asset,leg.amountUnits]));
  const receipt=authority.mint({quoteId:quote.id,wallet,payments,balances,now,requestId:action.id});
  s.wallet=a(receipt.balances.DIG);s.native.FENN.wallet=receipt.balances.FENN;s.native.NOMO.wallet=receipt.balances.NOMO;
  applyMintAllocation(s,receipt.nft.type,receipt.quote.legs);s=legacy.act(s,{type:'tick',id:`${action.id}:funding`},{now,rng});s.transactions.push(action.id);s.history.unshift({text:`SIMULATED ${receipt.nft.type} NFT #${receipt.nft.edition} minted. No real NFT or money transfer.`});return s;
 }
 if(action.type==='equip'){
  if(s.mythics[action.key])throw Error('Legacy item is not a verified NFT.');authority?.equip(wallet,null);
 }
 // The authority is queried at settlement, never read from saved nftEquipped/mythics.
 // Current release has owner-approved Shadow Forge artwork; historical callers retain their pre-release guard.
 let earnedBefore=earnedSnapshot(s);
 s=legacy.act(s,action,{now,rng,approvedShadowForge:true,finderDemoRates:action.type==='finder'?(action.testUsdPrices??null):null,afterRegularReward:(next,cell)=>{payBonus(next,cell,entitled());const receipt=discoveryReceipt(cell,earnedBefore,earnedSnapshot(next));if(receipt)discoveries.push(receipt);earnedBefore=earnedSnapshot(next);}});if(action.type==='pickaxe'){const receipt=discoveryReceipt(s.board[action.index],earnedBefore,earnedSnapshot(s));if(receipt)discoveries.push(receipt);}
 wallet=s.account.receivingWallet;s.nftEquipped=entitled()?.id||null;return s;
 };
 const settle=()=>authority?.settleOnce?authority.settleOnce(current.account.receivingWallet,action.id,()=>execute()):execute();
 const result=authority?.transact?authority.transact(settle):settle();
 if(discoveries.length)onDiscovery?.(discoveries);return result;
}
