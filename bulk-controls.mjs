// Target readiness only; prices, charging and settlement stay in the existing engine.
import {bulkTargets} from './nft-game.mjs';
export const BULK_TOOLS={smallCharge:{label:'Small Charge',price:'13,500 DIG',count:3,hint:'Choose three connected covered blocks.'},powerStrike:{label:'Power Strike',price:'18,000 DIG',count:4,hint:'Choose the upper-left covered block of an untouched 2×2 area.'},drill:{label:'FENN Deep Drill',price:'45,000 DIG',count:10,hint:'Choose a covered block in a completely untouched column.'},dynamite:{label:'NOMO Dynamite Run',price:'0.05 NOMO',count:10,hint:'Choose a covered block in the first of two completely untouched rows.'}};
export function bulkReadiness(game,kind,data){
 const spec=BULK_TOOLS[kind];if(!spec)return {valid:false,indices:[],reason:'Choose a supported tool.'};
 let indices;try{indices=bulkTargets(kind,data);}catch(error){return {valid:false,indices:[],reason:error.message+' '+spec.hint};}
 if(indices.length!==spec.count)return {valid:false,indices,reason:`${indices.length} / ${spec.count} targets selected. ${spec.hint}`};
 if(indices.some(i=>!Number.isInteger(i)||i<0||i>=50||game.board[i]?.state!=='covered'))return {valid:false,indices,reason:'This target includes an already excavated block. '+spec.hint};
 if(kind==='smallCharge'){const reached=new Set([indices[0]]);let changed=true;while(changed){changed=false;for(const i of indices)if(!reached.has(i)&&[...reached].some(j=>Math.abs(Math.floor(i/5)-Math.floor(j/5))+Math.abs(i%5-j%5)===1)){reached.add(i);changed=true;}}if(reached.size!==3)return {valid:false,indices,reason:'The three blocks must connect along their edges.'};}
 return {valid:true,indices,reason:`${spec.count} covered targets ready. No payment until you confirm.`};
}
