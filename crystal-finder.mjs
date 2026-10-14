// Owner-approved demo valuation only. Does not settle rewards or convert tokens.
export const FINDER_PRICE_SOURCE='USER_ENTERED_SIMULATED_USD';
const TOKENS=['DIG','FENN','NOMO'];
function ratio(value){if(typeof value!=='string'||!/^\d+(\.\d{1,18})?$/.test(value))throw Error('Enter positive test USD prices for DIG, FENN and NOMO.');const [whole,fraction='']=value.split('.'),n=BigInt(whole+fraction);if(n<=0n)throw Error('Enter positive test USD prices for DIG, FENN and NOMO.');return {n,d:10n**BigInt(fraction.length)};}
export function validFinderPrices(prices){try{for(const t of TOKENS)ratio(prices?.[t]);return true;}catch{return false;}}
export function scanCrystals(board,prices=null){
 if(!Array.isArray(board)||board.length!==50)throw Error('Crystal Finder requires the current 50-position board.');
 if(prices!==null&&!validFinderPrices(prices))throw Error('Enter positive test USD prices for DIG, FENN and NOMO.');
 const candidates=board.map((cell,index)=>({cell,index})).filter(({cell})=>cell.kind==='crystal'&&cell.state==='covered');
 const source=prices===null?{}:{valuationSource:FINDER_PRICE_SOURCE};
 if(!candidates.length)return {status:'none',...source};
 if(candidates.length>1&&prices===null)throw Error('Highest-value ranking across native tokens needs its authoritative valuation policy; Finder unavailable for this result. No charge made.');
 let chosen=candidates[0];
 if(candidates.length>1){
  let best=null;
  for(const candidate of candidates){const c=candidate.cell;if(!TOKENS.includes(c.asset))throw Error('Crystal currency is invalid.');
   const nominal=ratio(String(c.nominal)),price=ratio(prices[c.asset]),value={n:nominal.n*price.n,d:nominal.d*price.d};
   // Stable board order resolves equal values; disclose no other location or nominal amount.
   if(best===null||value.n*best.d>best.n*value.d){best=value;chosen=candidate;}
  }
 }
 return {status:candidates.length===1?'one':'multiple',index:chosen.index,asset:chosen.cell.asset,...source};
}
