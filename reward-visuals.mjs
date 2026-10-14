// Presentation only. Original approved sprites remain preserved in bindings.
export function shardBindingId(asset){return ['DIG','FENN'].includes(asset)?`reward.shard.${asset.toLowerCase()}.fragment`:null;}
export function rewardLabel(cell){
 if(cell.kind==='shard')return `${cell.asset} shard · fragment`;
 if(cell.kind==='crystal')return `${cell.asset} whole crystal`;
 return null;
}
