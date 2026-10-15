// Owner-approved native runway model. Forecast settings do not change reward odds/prices.
import {FENN_LADDER,NOMO_LADDER,METALS} from './engine.mjs';
export const POOL_FORECAST=Object.freeze({version:'native-forecast-v1',window:256,minimum:32,prior:32,safetyMargin:1.10,maximumRegularMythic:0.10});
export const NOMO_WHOLE_TABLE=[[.025,140],[.05,120],[.1,80],[.15,40],[.175,16],[.2,4]];
export const weightedMean=table=>table.reduce((n,[v,w])=>n+v*w,0)/table.reduce((n,[,w])=>n+w,0);
const minimum={FENN:[5e6,10e6,20e6,40e6],NOMO:[.01,.025,.05,.10]};
export function metalMean(asset,tier){const table=asset==='FENN'?FENN_LADDER:NOMO_LADDER,m=minimum[asset]?.[METALS.indexOf(tier)];if(m===undefined)throw Error('Unknown native metal tier.');const filtered=table.filter(([v])=>v>=m).map(x=>[...x]);filtered[0][1]+=table.filter(([v])=>v<m).reduce((n,[,w])=>n+w,0);return weightedMean(filtered);}
export function recordMetalSelection(s,{id,family,tier}){if(!['DIG','FENN','NOMO'].includes(family)||!METALS.includes(tier)||!id)throw Error('Invalid settled pickaxe sample.');s.metalSelections??=[];if(s.metalSelections.some(x=>x.id===id))return;s.metalSelections.push({id,family,tier});s.metalSelections=s.metalSelections.slice(-POOL_FORECAST.window);}
export function metalExposure(s,asset){const samples=(s.metalSelections||[]).slice(-POOL_FORECAST.window),n=samples.length,count=samples.filter(x=>x.family===asset).length;if(n<POOL_FORECAST.minimum)return {samples:n,count,observed:n?count/n:0,proportion:1,conservative:true};
 // A conservative prior fades smoothly; one extra selection cannot swing the estimate.
 const observed=count/n,blend=Math.min(1,(n-POOL_FORECAST.minimum)/(POOL_FORECAST.window-POOL_FORECAST.minimum)),proportion=1-blend*(1-(count+POOL_FORECAST.prior)/(n+POOL_FORECAST.prior));return {samples:n,count,observed,proportion,conservative:false};}
export function nativeForecast(s,asset,rate=s.controllers[asset].rate){if(!['FENN','NOMO'].includes(asset)||![100,75,50,25,10].includes(rate))throw Error('Unsupported native forecast.');
 const regularMean=weightedMean(asset==='FENN'?FENN_LADDER:NOMO_LADDER),crystalMean=weightedMean(asset==='FENN'?FENN_LADDER:NOMO_WHOLE_TABLE),exposure=metalExposure(s,asset),yieldFactor=rate/100;
 const regular=(asset==='FENN'?.15:.01)*regularMean*yieldFactor;
 const whole=.01*(asset==='FENN'?.235:.005)*crystalMean*yieldFactor;
 const shards=asset==='FENN'?.19*.25/10*crystalMean*yieldFactor:0;
 const metals=[.04,.02,.0075,.0025].reduce((n,p,i)=>n+p*metalMean(asset,METALS[i])*exposure.proportion*yieldFactor,0);
 // Future ownership is unknown: allow the largest eligible 10% regular bonus to
 // fall back to this native pool. Dedicated reserves can only improve this bound.
 const mythic=regular*POOL_FORECAST.maximumRegularMythic;
 const expected=(regular+whole+shards+metals+mythic)*POOL_FORECAST.safetyMargin;
 const b=s.native[asset],vault=Number(BigInt(b.vault))/1e12,reserved=Number(BigInt(b.reserved))/1e12,floor=asset==='NOMO'?2:0;
 const spendable=Math.max(0,vault-reserved-floor);
 const crystalReserved=s.crystals.filter(x=>x.asset===asset&&x.state==='owned').reduce((n,x)=>n+Number(BigInt(x.nativeReserve||'0'))/1e12,0);
 const shardReserved=(s.shards[asset]||[]).reduce((n,x)=>n+Number(BigInt(x.nativeReserve||'0'))/1e12,0);
 return {version:POOL_FORECAST.version,asset,rate,vault,reserved,floor,spendable,expectedLiability:expected,expectedDigs:expected?spendable/expected:Infinity,components:{regular,whole,shards,metals,mythic},exposure,obligations:{crystals:crystalReserved,shards:shardReserved,otherReserved:Math.max(0,reserved-crystalReserved-shardReserved)},safetyMargin:POOL_FORECAST.safetyMargin};}
export function refreshNativeForecast(s){for(const asset of ['FENN','NOMO']){const c=s.controllers[asset];c.forecast=nativeForecast(s,asset);c.runway=Object.fromEntries([100,75,50,25,10].map(rate=>[rate,nativeForecast(s,asset,rate).expectedDigs]));c.restartLiability=nativeForecast(s,asset,c.rate).expectedLiability*1000;}return s;}
