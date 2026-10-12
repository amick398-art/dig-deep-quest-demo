const variants = [
  ['DIG','DIG token'],['FENN','FENN token'],['NOMO','NOMO token'],
  ['DIG shard','DIG shard'],['FENN shard','FENN shard'],['+1 shovel','Shovel discovery'],
  ['DIG crystal','Emerald crystal'],['FENN crystal','Ruby crystal'],['NOMO crystal','Diamond crystal'],
  ['Empty','Empty position'],['Copper','Copper metal'],['Silver','Silver metal'],['Gold','Gold metal'],['Platinum','Platinum metal'],
];
const grid=document.getElementById('light-review');
for(const [label,type] of variants) {
  const card=document.createElement('section');card.className='review-card';
  const title=document.createElement('h3');title.textContent=type;
  const window=document.createElement('div');window.className='review-window';
  const status=document.createElement('span');status.textContent='Light · not excavated';
  const name=document.createElement('strong');name.textContent=label;
  window.append(status,name);
  const note=document.createElement('p');note.textContent=['Copper','Silver','Gold','Platinum'].includes(label)?'Excavate first. Pickaxe remains unavailable.':'No shovel consumed, payout issued, or progress awarded.';
  card.append(title,window,note);grid.append(card);
}
try {
  const response=await fetch('./assets/bindings.json');
  if(!response.ok)throw new Error();
  const count=Object.values((await response.json()).assets||{}).filter(x=>x.sourceVerified===true).length;
  document.getElementById('original-status').textContent=`${count} verified original artwork bindings available. ${count===0?'All official visual slots remain pending transfer.':'Unbound identities remain pending.'}`;
} catch {
  document.getElementById('original-status').textContent='Original artwork status unavailable. No draft has been marked approved.';
}
