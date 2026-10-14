// Public shop prices only. Gameplay charges remain in the preserved engine.
import {RULES,COSMETICS,PLATES,PICKAXE_PRICE,NATIVE_PRICES,DIG_ALTERNATIVES} from './nft-game.mjs';
import {NFT_TYPES} from './mythic-nft.mjs';
const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:12});
const title=s=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const token=(value,currency='DIG')=>({value,currency});
const row=(id,group,name,prices,note='')=>({id,group,name,prices,note,text:prices.map(p=>`${fmt(p.value)} ${p.currency}`).join(' or ')});
export function priceCatalogue(){
 const rows=[];
 for(const [key,price] of Object.entries(COSMETICS)){const r=row('cosmetic:'+key,'Cosmetic shovels',title(key)+' shovel',[token(price)],'Permanent skin only; no digging actions or reward bonus.');if(price===0)r.text='FREE · cosmetic only';rows.push(r);}
 for(const [type,spec] of Object.entries(NFT_TYPES))rows.push({id:'nft:'+type,group:'Mythic Shovel NFTs',name:type+' Mythic NFT',prices:[token(spec.usdCents/100,'USD')],text:`$${(spec.usdCents/100).toFixed(2)} USD · ${spec.currencies.join(' + ')} payment`,badge:`$${(spec.usdCents/100).toFixed(2)} USD`,note:spec.currencies.length===3?'Permanent NFT. $16.67 DIG + $16.67 FENN + $16.66 NOMO equivalents; atomic checkout. Simulated mint only.':'Permanent NFT. Current USD-equivalent token quote required; simulated mint only.'});
 for(const family of ['DIG','FENN','NOMO'])for(const tier of ['copper','silver','gold','platinum'])rows.push(row('pickaxe:'+family+'-'+tier,'Pickaxes',family+' '+title(tier)+' pickaxe',family==='DIG'?[token(PICKAXE_PRICE[tier])]:[token(NATIVE_PRICES[family][tier],family),token(DIG_ALTERNATIVES[family][tier])],family==='NOMO'?'Matching discovered metal required. DIG option unavailable without the approved quote guard.':'Matching discovered metal required; payment options are alternatives, not conversions.'));
 for(const [key,name,price,currency,note] of [['dynamite','NOMO Dynamite Run',.05,'NOMO','Two adjacent rows; 10 excavation actions included.'],['drill','FENN Deep Drill',45000,'DIG','One column; 10 excavation actions included.'],['smallCharge','Small Charge',13500,'DIG','Three connected positions; excavation actions included.'],['powerStrike','Power Strike',18000,'DIG','2×2 area; four excavation actions included.'],['depthPass','Depth Pass',10000,'DIG','Unlock early descent; confirm descent separately.']])rows.push(row((key==='depthPass'?'depth:':'bulk:')+key,'Special tools',name,[token(price,currency)],note));
 for(const [key,name,price] of [['light','Miner Light',2000],['detector','Metal Detector',3000],['scanner','Prospector Scanner',4000],['finder','Crystal Finder',2750]])rows.push(row('information:'+key,'Information tools',name,[token(price)],key==='finder'?'Simulated USD ranking: enter three test token prices; only the highest crystal type/location is disclosed. No excavation or rewards.':'Information only; no excavation, shovel consumption or reward.'));
 rows.push(row('boost:boost-pass','DIG Boost Pass','DIG Boost Pass',[token(RULES.passPrice)],`${RULES.passUses} eligible covered positions; purchase does not guarantee activation. DIG only.`));
 for(const count of [1,5,10,25,50])rows.push(row('pack:'+count,'Digging actions',`${count} purchased shovel${count===1?'':'s'}`,[token(count*RULES.shovelPrice)],'Digging actions; 4,500 DIG each, no pack discount.'));
 for(const [key,price] of Object.entries(PLATES))rows.push(row('plate:'+key,'Decorative plates',title(key)+' standalone plate',[token(price)],'Cosmetic only; new frame artwork remains marked for review.'));
 for(const [key,price] of [['silver',5000],['gold',10000],['platinum',25000]])rows.push(row('package:'+key,'Unavailable package references',title(key)+' decorative package',[token(price)],'Historical package price reference only. Contents are not specified; this package is not offered for sale.'));
 return rows;
}
const catalogue=new Map(priceCatalogue().map(r=>[r.id,r]));
export function itemPrice(item){return catalogue.get(item.kind+':'+item.key)||null;}
