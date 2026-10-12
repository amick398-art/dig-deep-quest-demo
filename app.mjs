import { RULES, createGame, act, publicBoard, spendable, resolved, PICKAXE_PRICE } from './engine.mjs';
const $ = id => document.getElementById(id);
const SAVE = 'dig-deep-quest-c29-demo-v1';
let game, selected = null, bindings = {}, busy = false, storageReady = true;
const fmt = n => n.toLocaleString('en-US',{maximumFractionDigits:4});
function transactionId() {
  // randomUUID requires a secure context; getRandomValues also supports a phone
  // accessing the local development server over ordinary HTTP.
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), n=>n.toString(16).padStart(8,'0')).join('');
}
function message(text, error=false) { $('message').textContent=text; $('message').dataset.error=String(error); }
try {
  const saved = localStorage.getItem(SAVE);
  game = saved ? JSON.parse(saved) : createGame();
  if (game.schema !== 1 || game.version !== RULES.version || !Array.isArray(game.board) || game.board.length !== 50) throw new Error('Save format does not match this demo. Existing save has been retained.');
} catch (error) {
  // Do not silently overwrite paid inventory or earned rights on a bad save.
  storageReady = false;
  game = createGame();
  $('save-status').textContent='Temporary session: existing save retained; new progress will not be saved.';
  message(`${error.message} This temporary session will not overwrite the saved game.`,true);
}
function save(s) {
  if (!storageReady) return;
  try { localStorage.setItem(SAVE, JSON.stringify(s)); }
  catch { storageReady=false; $('save-status').textContent='Browser storage unavailable. New progress will not be saved.'; }
}
async function run(type, data={}) {
  if (busy) return;
  busy = true;
  try {
    const next = await (navigator.locks?.request ? navigator.locks.request(SAVE, () => {
      const latest = storageReady && localStorage.getItem(SAVE);
      if (latest) game = JSON.parse(latest);
      const next = act(game, {type,...data,id:transactionId()});
      save(next);
      return next;
    }) : Promise.resolve().then(() => {
      const next = act(game,{type,...data,id:transactionId()}); save(next); return next;
    }));
    game = next;
    message(game.history[0]?.text || 'Ready.');
    render();
  } catch (error) { message(error.message,true); }
  finally { busy=false; }
}
function confirmAction(title,text,action) {
  const dialog=$('confirm-dialog');
  $('confirm-title').textContent=title; $('confirm-text').textContent=text;
  dialog.returnValue='';
  dialog.addEventListener('close', () => { if(dialog.returnValue==='confirm') action(); }, {once:true});
  dialog.showModal();
}
function asset(id) { const binding=bindings[id]; return binding?.sourceVerified === true ? binding.file : null; }
function cellAsset(cell) {
  if(cell.state==='covered') return cell.light ? null : asset('board.covered');
  if(cell.state==='metal') return asset(`board.metal.${cell.kind}`);
  if(cell.kind==='empty') return asset('board.resolved_empty');
  if(cell.kind==='shard') return asset(`reward.shard.${cell.asset.toLowerCase()}`);
  if(cell.kind==='crystal') return asset(`reward.crystal.${cell.asset.toLowerCase()}`);
  return asset(`reward.token.${(cell.kind||'').toLowerCase()}`);
}
const names={DIG:'DIG',FENN:'FENN',NOMO:'NOMO',empty:'Empty',shovel:'+1 shovel',shard:'Shard',crystal:'Crystal',copper:'Copper',silver:'Silver',gold:'Gold',platinum:'Platinum'};
function renderBoard() {
  const board=$('board');
  // Keep focus across state renders for keyboard users.
  const focusIndex=document.activeElement?.dataset.index;
  board.replaceChildren();
  for(const cell of publicBoard(game)) {
    const row=Math.floor(cell.index/5)+1,col=cell.index%5+1;
    const button=document.createElement('button');
    button.type='button';button.className='cell';button.dataset.index=cell.index;
    button.dataset.state=cell.state;button.dataset.light=String(cell.light);
    button.setAttribute('aria-pressed',String(selected===cell.index));
    const label=cell.kind ? `${names[cell.kind]}${cell.asset ? ` · ${cell.asset}` : ''}${cell.light&&cell.state==='covered'?' · lit, unexcavated':''}${cell.state==='metal'?' · unresolved':''}` : 'Covered';
    const file=cellAsset(cell);
    button.setAttribute('aria-label',`Row ${row}, column ${col}: ${label}${file?'':' · placeholder visual'}`);
    if(file) {
      const img=document.createElement('img');img.src=file;img.alt='';
      img.addEventListener('error',()=>{img.remove();message(`Artwork file missing for ${label}; temporary text label retained.`,true);},{once:true});
      button.append(img);
    }
    const symbol=document.createElement('span');symbol.className='symbol'+(file?' over-art':'');
    symbol.textContent=cell.kind ? (cell.kind==='empty'?'·':cell.kind==='shovel'?'+1':cell.kind==='shard'?'◆':cell.kind==='crystal'?'◇':names[cell.kind].slice(0,2)) : '?';
    const caption=document.createElement('span');caption.textContent=cell.kind ? names[cell.kind] : `${row} · ${col}`; if(file) caption.className='over-art';
    button.append(symbol,caption);
    button.onclick=()=>{selected=cell.index;render();};
    button.onkeydown=event=>{
      const delta={ArrowUp:-5,ArrowDown:5,ArrowLeft:-1,ArrowRight:1}[event.key];
      if(delta!==undefined){event.preventDefault();const index=cell.index+delta;if(index>=0&&index<50){selected=index;render();board.querySelector(`[data-index="${index}"]`).focus();}}
    };
    board.append(button);
  }
  if(focusIndex!==undefined) board.querySelector(`[data-index="${focusIndex}"]`)?.focus();
}
function render() {
  $('wallet').textContent=fmt(game.wallet);$('shovels').textContent=fmt(game.shovels);
  $('earned').textContent=fmt(game.earned);$('rewards').textContent=fmt(game.profileRewards);
  $('pass').textContent=fmt(game.pass.remaining);$('depth').textContent=game.depth;
  $('progress').textContent=`${resolved(game)} / 35`;$('progress-bar').value=Math.min(35,resolved(game));
  $('spendable').textContent=fmt(spendable(game));$('reserved').textContent=fmt(game.reserved);$('treasury').textContent=fmt(game.treasury);
  const cooldown=game.boost.endedAt===null?0:Math.max(0,Math.ceil((game.boost.endedAt+RULES.cooldown-Date.now())/1000));
  $('boost-status').textContent=game.boost.active?`Boost ${game.boost.id} active · covered DIG 90%`:cooldown?`Boost cooldown · ${cooldown}s remaining`:'Boost inactive · normal DIG 75%';
  const freeWait=game.lastFreeClaim===null?0:Math.max(0,game.lastFreeClaim+RULES.freeInterval-Date.now());
  $('free-status').textContent=game.wallet<RULES.freeGate?'Daily claim requires 500,000 DIG held in this demo wallet.':freeWait?`Daily pair available in ${Math.ceil(freeWait/3600000)} hours.`:'Eligible: 2 free shovels once per 24 hours.';
  $('free').disabled=freeWait>0||game.wallet<RULES.freeGate;
  $('descend').disabled=resolved(game)<35&&!game.earlyDescent;
  $('depth-pass').disabled=game.earlyDescent||resolved(game)>=35;
  $('claim-rewards').disabled=game.profileRewards===0||game.wallet>=RULES.cap;
  const cell=selected===null?null:publicBoard(game)[selected];
  $('target').textContent=cell?`Selected row ${Math.floor(selected/5)+1}, column ${selected%5+1} · ${cell.kind?names[cell.kind]:'covered'}`:'Select a covered position.';
  $('dig').disabled=!cell||cell.state!=='covered'||game.shovels<1;
  $('pickaxe').disabled=!cell||cell.state!=='metal';
  $('pickaxe').textContent=cell?.state==='metal'?`DIG ${names[cell.kind]} pickaxe · ${fmt(PICKAXE_PRICE[cell.kind])} DIG`:'DIG pickaxe · select discovered metal';
  $('light').disabled=!cell||cell.state!=='covered'||cell.light;
  $('detector').disabled=game.info.detector!==null;
  $('scanner').disabled=!cell||Object.hasOwn(game.info.rows,Math.floor(selected/5));
  $('info').replaceChildren();
  const info=[];
  if(game.info.detector!==null)info.push(`Depth detector: ${game.info.detector?'metal remains':'no undiscovered metal'}`);
  for(const [row,present] of Object.entries(game.info.rows))info.push(`Row ${Number(row)+1}: ${present?'metal present':'no undiscovered metal'}`);
  $('info').textContent=info.join(' · ');
  $('shards').textContent=`Shards · DIG ${game.shards.DIG.length}/10 · FENN ${game.shards.FENN.length}/10`;
  $('crystals').replaceChildren();
  for(const crystal of game.crystals.filter(x=>x.state==='owned')) {
    const div=document.createElement('div');div.className='inventory-item';
    const text=document.createElement('span');text.textContent=`Owned ${crystal.asset} ${crystal.origin==='shards'?'shard-formed ':''}crystal`;
    div.append(text);
    if(crystal.asset==='DIG'&&crystal.origin==='whole'){
      const button=document.createElement('button');button.textContent='Break and settle simulated DIG';button.onclick=()=>run('breakCrystal',{crystalId:crystal.id});div.append(button);
    } else { const hint=document.createElement('p');hint.className='hint';hint.textContent='Owned right retained. Settlement policy/controller pending.';div.append(hint); }
    $('crystals').append(div);
  }
  if(!$('crystals').childElementCount)$('crystals').textContent='No owned crystals yet.';
  $('supplemental').textContent=`${game.supplemental.length} FENN/NOMO discoveries held for native settlement. Their yield/safety controllers are pending; no live balances or quotes are fabricated.`;
  $('activity').replaceChildren();
  for(const entry of game.history.slice(0,8)){const li=document.createElement('li');li.textContent=entry.text;$('activity').append(li);}
  renderBoard();
}
$('buy-shovels').onclick=()=>run('buyShovels',{count:Number($('pack').value)});
$('free').onclick=()=>run('free');
$('buy-pass').onclick=()=>confirmAction('Buy a simulated Boost Pass?', '260,000 DIG for 250 eligible future covered positions. Digging actions cost extra. NO REFUNDS. Uses carry forward; activation, timing, utilization, and profit are not guaranteed.',()=>run('buyPass',{acceptNoRefunds:true}));
$('dig').onclick=()=>run('dig',{index:selected});
$('pickaxe').onclick=()=>run('pickaxe',{index:selected,family:'DIG'});
$('light').onclick=()=>run('light',{index:selected});
$('detector').onclick=()=>run('detector');
$('scanner').onclick=()=>run('scanner',{row:Math.floor(selected/5)});
$('depth-pass').onclick=()=>run('depthPass');
$('descend').onclick=()=>confirmAction('Close this depth?', 'This depth cannot reopen. Unexcavated positions and unresolved metal are abandoned. Owned crystals, shards, held discoveries, shovels, and unused Boost coverage persist.',()=>{selected=null;run('descend',{confirmed:true});});
$('claim-rewards').onclick=()=>run('claimRewards');
$('deposit').onclick=()=>run('deposit',{amount:20000000});
window.addEventListener('storage',event=>{if(event.key===SAVE&&event.newValue){try{game=JSON.parse(event.newValue);render();}catch{message('Another tab produced an unreadable save. Reload after resolving it.',true);}}});
try {
  const response=await fetch('./assets/bindings.json');
  if(!response.ok)throw new Error('Missing asset bindings.');
  bindings=(await response.json()).assets||{};
  const count=Object.values(bindings).filter(x=>x.sourceVerified===true).length;
  if(count)$('art-status').textContent=`${count} original asset bindings available. Missing visuals remain explicitly labeled placeholders; new UI remains a development treatment.`;
} catch { message('Asset map unavailable. Temporary labeled visuals retained.',true); }
render();
// Timer evaluation is local simulation, not a live economic service.
setInterval(()=>{
  if(document.hidden||busy)return;
  const before=JSON.stringify(game.boost);
  const next=act(game,{type:'tick',id:transactionId()});
  if(JSON.stringify(next.boost)!==before)run('tick');
  else render();
},1000);
