// New presentation behavior; original artwork and reward rules remain unchanged.
export const COIN_REGIONS={DIG:[102,8,410,414],NOMO:[550,8,425,420],FENN:[1000,8,425,420]};
export function earnedSnapshot(s){return {DIG:s.earned,FENN:BigInt(s.native.FENN.earned),NOMO:BigInt(s.native.NOMO.earned)};}
const format=n=>{const whole=n/1000000000000n,fraction=(n%1000000000000n).toString().padStart(12,'0').replace(/0+$/,'');return whole.toLocaleString('en-US')+(fraction?'.'+fraction:'');};
export function discoveryReceipt(cell,before,after){
 if(cell.state!=='resolved'||cell.kind==='empty')return null;
 const amounts=Object.keys(before).map(token=>({token,units:token==='DIG'?BigInt(Math.round((after[token]-before[token])*1e12)):after[token]-before[token]})).filter(x=>x.units>0n);
 const text=amounts.length?amounts.map(x=>`+${format(x.units)} ${x.token}`).join(' · '):cell.kind==='shard'?`+1 ${cell.asset} shard`:cell.kind==='crystal'?`+1 ${cell.asset} crystal`:cell.kind==='shovel'?'+1 shovel':null;
 return text?{index:cell.index,text,amounts:amounts.map(x=>({...x,units:String(x.units)}))}:null;
}
export class RewardReveals{
 constructor(changed,{schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),duration=1800}={}){this.changed=changed;this.schedule=schedule;this.cancel=cancel;this.duration=duration;this.entries=new Map();this.generation=0;this.key=null;}
 context(depth,wallet){const key=JSON.stringify([depth,wallet]);if(key!==this.key){for(const e of this.entries.values())if(e.timer)this.cancel(e.timer);this.entries.clear();this.key=key;this.generation++;}}
 prepare(receipts){const ticket={generation:this.generation,items:[]};for(const receipt of receipts){const entry={receipt,visible:false};this.entries.set(receipt.index,entry);ticket.items.push(entry);}return ticket;}
 show(ticket){if(!ticket||ticket.generation!==this.generation)return;for(const entry of ticket.items){if(this.entries.get(entry.receipt.index)!==entry||entry.visible)continue;entry.visible=true;entry.timer=this.schedule(()=>{if(this.entries.get(entry.receipt.index)===entry){this.entries.delete(entry.receipt.index);this.changed();}},this.duration);}this.changed();}
 get(index){return this.entries.get(index);}
 signature(){return [...this.entries.values()].map(e=>[e.receipt.index,e.visible,e.receipt.text]);}
}
