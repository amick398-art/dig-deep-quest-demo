import {RewardReveals,COIN_REGIONS} from './reward-reveal.mjs?v=loot-reveal-20261014';
import {enablePoolAutomation,enableFusionRewards} from './nft-game.mjs?v=loot-reveal-20261014';
import {CrystalFusionCinematic} from './crystal-cinematic.mjs';
import {BULK_TOOLS,bulkReadiness} from './bulk-controls.mjs?v=loot-reveal-20261014';
import {restorePoolEmblems,restoreCleanBoard} from './board-presentation.mjs?v=loot-reveal-20261014';
import { RULES, createGame, restoreGame, act, publicBoard, spendable, resolved, PICKAXE_PRICE, balance, nativeSpendable, COSMETICS, PLATES, NATIVE_PRICES, DIG_ALTERNATIVES, amount, bulkTargets } from './nft-game.mjs?v=loot-reveal-20261014';
import { MiningPresentation } from './effects.mjs?v=loot-reveal-20261014';
import { DescentCinematic } from './descent.mjs?v=loot-reveal-20261014';
import { MythicShop } from './nft-shop.mjs?v=loot-reveal-20261014';
import { ApprovedShop, approvedArtwork } from './approved-shop.mjs?v=loot-reveal-20261014';
import { closeGamePanels, refreshChoices } from './interface.mjs?v=loot-reveal-20261014';
import approvedBoardLayout from './approved-board-layout.mjs?v=loot-reveal-20261014';
import {shardBindingId,rewardLabel} from './reward-visuals.mjs?v=loot-reveal-20261014';
import {NomoRunCinematic} from './nomo-cinematic.mjs?v=loot-reveal-20261014';
const $ = id => document.getElementById(id);
const presentation=new MiningPresentation($('mining-stage'));
const descentCinematic=new DescentCinematic($('descent-cinematic'),{onTunnelStart:()=>presentation.tone('descend')});
const nomoCinematic=new NomoRunCinematic($('nomo-cinematic'),{getArt:cell=>cellAsset(cell),onBlast:()=>presentation.tone('dynamite')});
const fusionCinematic=new CrystalFusionCinematic($('crystal-fusion'),{getArt:(kind,token)=>kind==='shard'?asset(shardBindingId(token)):asset(`reward.crystal.${token.toLowerCase()}`)});
const SAVE = 'dig-deep-quest-c29-demo-v1';
let game, selected = null, bindings = {}, candidateBindings={}, boardLayout = approvedBoardLayout, busy = false, storageReady = true, shopFingerprint='', boardFingerprint='';
let chargeTargets=[],bulkMode=null;
const rewardReveals=new RewardReveals(()=>renderBoard());
const nftShop=new MythicShop($('mythic-shop'),{getGame:()=>game,perform:run,confirm:confirmAction,message,getBindings:()=>bindings});
const approvedShop=new ApprovedShop($('approved-shop'),{getGame:()=>game,getSelected:()=>selected,getChargeTargets:()=>[...chargeTargets],perform:run,confirm:confirmAction,requestBulk:confirmBulk,startBulk:beginBulkTargeting,setFamily:(family)=>{$('reward-family').value=family;$('pay-currency').value=family;render();refreshChoices();}});
const mobileView=matchMedia('(max-width:620px)');
const compactNumber=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const sceneNumber=n=>mobileView.matches?compactNumber.format(n):fmt(n);
const fmt = n => n.toLocaleString('en-US',{maximumFractionDigits:12});
function transactionId() {
  // randomUUID requires a secure context; getRandomValues also supports a phone
  // accessing the local development server over ordinary HTTP.
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), n=>n.toString(16).padStart(8,'0')).join('');
}
function message(text, error=false) { $('message').textContent=text; $('message').dataset.error=String(error);const shopMessage=$('approved-shop-message');if(shopMessage){shopMessage.textContent=text;shopMessage.dataset.error=String(error);} }
try {
  const saved = localStorage.getItem(SAVE);
  game = saved ? JSON.parse(saved) : createGame();
  if (game.schema !== 1 || game.version !== RULES.version || !Array.isArray(game.board) || game.board.length !== 50) throw new Error('Save format does not match this demo. Existing save has been retained.');
  if(saved&&!game.native&&!localStorage.getItem(SAVE+'-before-extensions'))localStorage.setItem(SAVE+'-before-extensions',saved);
  game=enableFusionRewards(enablePoolAutomation(restoreGame(game)));
} catch (error) {
  // Do not silently overwrite paid inventory or earned rights on a bad save.
  storageReady = false;
  game = createGame();
  $('save-status').textContent='Temporary session: existing save retained; new progress will not be saved.';
  message(`${error.message} This temporary session will not overwrite the saved game.`,true);
}
function save(s) {
  if (!storageReady) return false;
  try { localStorage.setItem(SAVE, JSON.stringify(s));return true; }
  catch { storageReady=false; $('save-status').textContent='Browser storage unavailable. New progress will not be saved.'; }
}
async function run(type, data={}) {
  if (busy) return;
  busy = true;
  const context={expectedWallet:data.expectedWallet??game.account.receivingWallet};
  if(['dig','pickaxe','bulk','light','detector','scanner','finder','depthPass','descend'].includes(type))context.expectedDepth=data.expectedDepth??game.depth;
  try {
    let discoveries=[];
    const onDiscovery=items=>{discoveries=items;};
    const next = await (navigator.locks?.request ? navigator.locks.request(SAVE, () => {
      const latest = storageReady && localStorage.getItem(SAVE);
      if (latest) game = JSON.parse(latest);
      const next = act(game, {type,...data,...context,id:transactionId()},{authority:nftShop.authority(),onDiscovery});
      nftShop.commit(next);
      if(!save(next))throw Error('Could not save this action; original saved inventory and rewards retained.');
      return next;
    }) : Promise.resolve().then(() => {
      const next = act(game,{type,...data,...context,id:transactionId()},{authority:nftShop.authority(),onDiscovery}); nftShop.commit(next); if(!save(next))throw Error('Could not save this action; original saved inventory and rewards retained.'); return next;
    }));
    const previous=game;game = next;
    rewardReveals.context(game.depth,game.account.receivingWallet);
    const revealTicket=rewardReveals.prepare(discoveries);
    message(game.history[0]?.text || 'Ready.');
    if(type==='bulk'){$('charge-mode').checked=false;chargeTargets=[];bulkMode=null;}
    render();
    if(['dig','pickaxe','bulk','light','detector','scanner','finder','breakCrystal','descend'].includes(type))closeGamePanels();
    if(type==='descend')await descentCinematic.play(previous,next);
    else if(type==='bulk'&&data.kind==='dynamite'){await nomoCinematic.play(previous,next,data);rewardReveals.show(revealTicket);}
    else if(['dig','pickaxe','bulk','light','detector','scanner','finder','breakCrystal'].includes(type)){const showing=presentAction(type,data,previous,next,revealTicket).catch(()=>{});if(game.fusionQueue?.length)await showing;}
    await processFusionRewards({resume:data.resumeFusions===true});
  } catch (error) { message(error.message,true); }
  finally { busy=false; }
}
async function processFusionRewards({resume=false}={}){
 while(game.fusionQueue?.length){const pending=game.fusionQueue[0];
  // The exact amount and identifier were persisted with the earning action.
  if(!storageReady)throw Error('Storage unavailable. Fusion entitlement retained in this session; restore storage before settlement.');
  if(!resume)await fusionCinematic.play(pending);
  const settle=()=>{const latest=localStorage.getItem(SAVE);const current=latest?JSON.parse(latest):game;const next=act(current,{type:'finalizeFusion',rewardId:pending.id,id:'fusion-finalize:'+pending.id});if(!save(next))throw Error('Reward remains in saved pending queue; reload to recover it.');return next;};
  game=await(navigator.locks?.request?navigator.locks.request(SAVE,settle):Promise.resolve().then(settle));render();message(game.history[0]?.text||'Crystal reward credited.');
 }
}
function confirmAction(title,text,action) {
  const expectedDepth=game.depth,expectedWallet=game.account.receivingWallet;
  const dialog=$('confirm-dialog');
  $('confirm-title').textContent=title; $('confirm-text').textContent=text;
  dialog.returnValue='';
  dialog.addEventListener('close', () => { if(dialog.returnValue==='confirm'){if(game.depth!==expectedDepth||game.account.receivingWallet!==expectedWallet){message('Expedition or wallet changed while checkout was open. Review it again; no charge made.',true);return;}action();} }, {once:true});
  dialog.showModal();
}
const assetAliases={'board.covered':'tile.covered','board.resolved_empty':'tile.empty','reward.shard.dig':'tile.dig_shard','reward.shard.fenn':'ui.fenn_shard','reward.crystal.nomo':'ui.nomo_crystal','reward.token.dig':'currency.selected_coins','reward.token.fenn':'currency.selected_coins','reward.token.nomo':'currency.selected_coins','reward.token.shovel':'shovel.basic.sprite'};
function asset(id) { const binding=bindings[assetAliases[id]||id.replace('board.metal.','tile.')]; return binding?.sourceVerified === true ? binding.file : candidateBindings[id]?.allowedInDemo===true?candidateBindings[id].file:null; }
function cellAsset(cell) {
  if(cell.state==='covered'&&!cell.light)return asset('board.covered');
  if(cell.state==='metal'||cell.light&&['copper','silver','gold','platinum'].includes(cell.kind)) return asset(`board.metal.${cell.kind}`);
  if(cell.state==='resolved'&&['copper','silver','gold','platinum'].includes(cell.kind))return asset('board.resolved_empty');
  if(cell.kind==='empty') return asset('board.resolved_empty');
  if(cell.kind==='shard'){const id=shardBindingId(cell.asset);return id?asset(id):null;}
  if(cell.kind==='crystal') return asset(`reward.crystal.${cell.asset.toLowerCase()}`);
  return asset(`reward.token.${(cell.kind||'').toLowerCase()}`);
}
const names={DIG:'DIG',FENN:'FENN',NOMO:'NOMO',empty:'Empty',shovel:'+1 shovel',shard:'Shard',crystal:'Crystal',copper:'Copper',silver:'Silver',gold:'Gold',platinum:'Platinum'};
function renderBoard() {
  const board=$('board');
  rewardReveals.context(game.depth,game.account.receivingWallet);
  const cells=publicBoard(game);
  const signature=JSON.stringify([game.depth,cells,selected,chargeTargets,bulkMode,boardLayout,Object.keys(bindings),Object.keys(candidateBindings),rewardReveals.signature()]);
  if(signature===boardFingerprint)return;
  boardFingerprint=signature;
  // Retain the actual touch/keyboard target across selection and settlement.
  // Replacing the button between taps can cancel native mobile click synthesis.
  const existing=new Map([...board.children].map(node=>[Number(node.dataset.index),node]));
  for(const sourceCell of cells) {
    const reveal=rewardReveals.get(sourceCell.index);
    const cell=sourceCell.state==='resolved'&&reveal?.visible&&['copper','silver','gold','platinum'].includes(sourceCell.kind)?{...sourceCell,kind:reveal.receipt.amounts[0]?.token||sourceCell.kind}:sourceCell;
    const row=Math.floor(cell.index/5)+1,col=cell.index%5+1;
    const button=existing.get(cell.index)||document.createElement('button');
    button.replaceChildren();
    delete button.dataset.charge;delete button.dataset.bulkTarget;
    button.type='button';button.className='cell';button.dataset.index=cell.index;
    button.dataset.kind=cell.kind||'';
    if(boardLayout){const [x,y,w,h]=boardLayout.cells[cell.index].rect;Object.assign(button.style,{left:`${x/boardLayout.width*100}%`,top:`${y/boardLayout.height*100}%`,width:`${w/boardLayout.width*100}%`,height:`${h/boardLayout.height*100}%`});}
    button.dataset.state=cell.state;button.dataset.light=String(cell.light);
    button.dataset.rewardForm=cell.kind==='shard'?'fragment':cell.kind==='crystal'?'whole':'';
    button.setAttribute('aria-pressed',String(selected===cell.index));
    const label=cell.kind ? `${rewardLabel(cell)||names[cell.kind]}${cell.asset&&!rewardLabel(cell) ? ` · ${cell.asset}` : ''}${cell.light&&cell.state==='covered'?' · lit, unexcavated':''}${cell.state==='metal'?' · unresolved':cell.state==='resolved'&&['copper','silver','gold','platinum'].includes(cell.kind)?' · collected':''}` : 'Covered';
    const collected=cell.state==='resolved';
    const showReward=collected&&reveal?.visible;
    button.dataset.rewardVisible=String(Boolean(showReward));
    const file=collected&&!showReward?asset('board.resolved_empty'):cell.state==='covered'&&!cell.light&&boardLayout?null:cellAsset(cell);
    const officialCovered=cell.state==='covered'&&!cell.light&&boardLayout;
    const candidate=collected&&!showReward?null:cell.kind==='crystal'?candidateBindings[`reward.crystal.${cell.asset.toLowerCase()}`]:cell.kind==='shard'?candidateBindings[shardBindingId(cell.asset)]:null;button.dataset.reviewArt=String(Boolean(candidate));
    button.dataset.art=String(Boolean(file||officialCovered));
    button.setAttribute('aria-label',`Row ${row}, column ${col}: ${label}${candidate?' · review visual':file||officialCovered?'':' · placeholder visual'}`);
    if(file) {
      const artParent=cell.state==='covered'&&cell.light?document.createElement('span'):button;
      if(artParent!==button){artParent.className='light-window';button.append(artParent);}
      if(['DIG','FENN','NOMO'].includes(cell.kind)&&(!collected||showReward)){
        const coin=document.createElement('span');coin.className='coin-face';coin.dataset.token=cell.kind;const [x,y,w,h]=COIN_REGIONS[cell.kind],img=document.createElement('img');coin.style.aspectRatio=w+'/'+h;img.src=file;img.alt='';Object.assign(img.style,{width:1536/w*100+'%',height:512/h*100+'%',left:-x/w*100+'%',top:-y/h*100+'%'});coin.append(img);artParent.append(coin);
      }else{
      const img=document.createElement('img');img.src=file;img.alt='';
      if(cell.kind==='shard'&&(!collected||showReward))img.className='fragment-art';
      img.addEventListener('error',()=>{img.remove();message(`Artwork file missing for ${label}; temporary text label retained.`,true);},{once:true});
      artParent.append(img);
      }
    }
    const symbol=document.createElement('span');symbol.className='symbol'+(file?' over-art':'');
    symbol.textContent=cell.kind ? (cell.kind==='empty'?'·':cell.kind==='shovel'?'+1':cell.kind==='shard'?'◆':cell.kind==='crystal'?'◇':names[cell.kind].slice(0,2)) : '?';
    const caption=document.createElement('span');caption.textContent=cell.kind ? names[cell.kind] : `${row} · ${col}`; if(file) caption.className='over-art';
    if(!collected||showReward)button.append(symbol,caption);
    if(showReward){const popup=document.createElement('span');popup.className='reward-amount';popup.textContent=reveal.receipt.text;popup.setAttribute('role','status');button.append(popup);const edge=Math.min(innerWidth,$('board').closest('.scene-viewport').getBoundingClientRect().right)-4;if(popup.getBoundingClientRect().right>edge){popup.style.left='auto';popup.style.right='60%';}}
    if(['shard','crystal'].includes(cell.kind)&&(!collected||showReward)){const shape=document.createElement('small');shape.className='reward-shape-label';shape.textContent=cell.kind==='shard'?'SHARD':'WHOLE';button.append(shape);}
    if(cell.light&&cell.state==='covered'){const lit=document.createElement('small');lit.className='lit-label';lit.textContent='LIT · COVERED';button.append(lit);}
    if(chargeTargets.includes(cell.index))button.dataset.charge='true';if(bulkMode&&bulkReadiness(game,bulkMode,bulkSelection(bulkMode)).indices.includes(cell.index))button.dataset.bulkTarget='true';
    button.onclick=()=>{
      if(busy)return;
      const repeat=selected===cell.index;
      selected=cell.index;
      if($('charge-mode').checked){chargeTargets=chargeTargets.includes(cell.index)?chargeTargets.filter(i=>i!==cell.index):[...chargeTargets,cell.index].slice(-3);render();return;}
      if(bulkMode){render();return;}
      if(repeat&&game.board[cell.index]?.state==='covered'){void run('dig',{index:cell.index});return;}
      render();
    };
    button.onkeydown=event=>{
      const delta={ArrowUp:-5,ArrowDown:5,ArrowLeft:-1,ArrowRight:1}[event.key];
      if(delta!==undefined){event.preventDefault();const index=cell.index+delta;if(index>=0&&index<50){selected=index;render();board.querySelector(`[data-index="${index}"]`).focus();}}
    };
    if(!button.isConnected)board.append(button);
  }
}
function renderTimeStatus() {
  approvedShop.refreshTimeStatus();
  const cooldown=game.boost.endedAt===null?0:Math.max(0,Math.ceil((game.boost.endedAt+RULES.cooldown-Date.now())/1000));
  $('boost-status').textContent=game.boost.active?`DIG Boost ${game.boost.id} active · covered DIG 90%`:cooldown?`DIG Boost cooldown · ${cooldown}s remaining`:'DIG Boost inactive · normal DIG 75%';
  document.body.dataset.boost=String(game.boost.active);
  const freeWait=game.lastFreeClaim===null?0:Math.max(0,game.lastFreeClaim+RULES.freeInterval-Date.now());
  const designated=game.account.designatedWallet===game.account.receivingWallet?game.wallet:game.account.wallets.find(w=>w.id===game.account.designatedWallet)?.DIG||0;
  $('free-status').textContent=designated<RULES.freeGate?'Daily claim requires 500,000 DIG held in the designated demo wallet.':freeWait?`Daily pair available in ${Math.ceil(freeWait/3600000)} hours.`:'Eligible: refill free balance to 2 once per 24 hours.';
  $('free').disabled=freeWait>0||designated<RULES.freeGate||!game.account.eligible;
  $('scene-free').disabled=$('free').disabled;
  $('scene-refill').textContent=designated<RULES.freeGate?'Requires 500,000 DIG held':!game.account.eligible?'Profile ineligible':freeWait?`Daily pair in ${Math.ceil(freeWait/3600000)}h`:'Daily pair available';
  $('scene-yield-DIG').textContent=game.boost.active?'90% covered Boost':'75% normal yield';
}
function render() {
  approvedShop.refresh();
  $('wallet').textContent=fmt(game.wallet);$('shovels').textContent=fmt(game.shovels);
  $('earned').textContent=fmt(game.earned);$('rewards').textContent=fmt(game.profileRewards);
  $('scene-shovels').textContent=sceneNumber(game.shovels);$('scene-shovels').title=fmt(game.shovels)+' shovels';$('scene-free-count').textContent=game.freeShovels;$('scene-stored-count').textContent=game.storedShovels;
  for(const token of ['DIG','FENN','NOMO']){
    const poolValue=token==='DIG'?spendable(game):(game.controllers[token].forecast?.spendable??nativeSpendable(game,token)),poolNode=$(`scene-pool-${token}`);poolNode.textContent=sceneNumber(poolValue);poolNode.title=fmt(poolValue)+' '+token;poolNode.setAttribute('aria-label',fmt(poolValue)+' '+token+' spendable');
    if(token!=='DIG')$(`scene-yield-${token}`).textContent=game.controllers[token].paused?'Pool paused':`${game.controllers[token].rate}% yield`;
  }
  for(const token of ['DIG','FENN'])$(`scene-shards-${token}`).textContent=`${game.shards[token].length} / 10`;
  for(const native of ['FENN','NOMO']){
    $(`wallet-${native}`).textContent=fmt(balance(game,native));$(`rewards-${native}`).textContent=fmt(balance(game,native,'profileRewards'));
    $(`pool-${native}`).textContent=`${fmt(nativeSpendable(game,native))} spendable · ${game.controllers[native].rate}% yield${game.controllers[native].paused?' · PAUSED':''}`;
    $(`claim-${native}`).disabled=balance(game,native,'profileRewards')===0||balance(game,native)>=({FENN:30e9,NOMO:300}[native]);
  }
  $('pass').textContent=fmt(game.pass.remaining);$('depth').textContent=game.depth;
  $('progress').textContent=`${resolved(game)} / 35`;$('progress-bar').value=Math.min(35,resolved(game));
  $('spendable').textContent=fmt(spendable(game));$('reserved').textContent=fmt(game.reserved);$('treasury').textContent=fmt(game.treasury);
  $('ledger-monitor').replaceChildren();
  for(const token of ['DIG','FENN','NOMO']){
    const b=token==='DIG'?{vault:game.vault,reserved:game.reserved,treasury:game.treasury,...game.buckets}:Object.fromEntries(['vault','reserved','treasury','burn','liquidity','oso','bebe'].map(k=>[k,balance(game,token,k)]));
    const p=document.createElement('p');p.className='hint';p.textContent=`${token} · actual pool ${fmt(b.vault)} · protected ${fmt(b.reserved)} · spendable ${fmt(b.vault-b.reserved)} · treasury ${fmt(b.treasury)} · burn ${fmt(b.burn)} · liquidity ${fmt(b.liquidity)} · Oso ${fmt(b.oso)} · Bebe ${fmt(b.bebe)}`;$('ledger-monitor').append(p);
  }
  $('equipped-plate').replaceChildren();if(game.equippedPlate){$('equipped-plate').append(platePreview(game.equippedPlate));$('equipped-plate').setAttribute('aria-label',`${game.equippedPlate} decorative plate · new art awaiting review`);}
  renderTimeStatus();
  $('descend').disabled=resolved(game)<35&&!game.earlyDescent;
  $('depth-pass').disabled=game.earlyDescent||resolved(game)>=35;
  $('claim-rewards').disabled=game.profileRewards===0||game.wallet>=RULES.cap;
  const cell=selected===null?null:publicBoard(game)[selected];
  $('target').textContent=cell?`Selected row ${Math.floor(selected/5)+1}, column ${selected%5+1} · ${cell.kind?(rewardLabel(cell)||names[cell.kind]):'covered'}${cell.state==='covered'&&!$('charge-mode').checked?' · tap again to mine':''}`:'Tap a covered block to select it; tap it again to mine.';
  $('dig').disabled=!cell||cell.state!=='covered'||game.shovels<1;
  $('pickaxe').disabled=!cell||cell.state!=='metal';
  const family=$('reward-family').value,payment=$('pay-currency').value;
  const validPayment=family==='DIG'?payment==='DIG':payment===family||payment==='DIG';
  const quoteBlocked=family==='NOMO'&&payment==='DIG'&&!game.quoteReady;
  $('pickaxe').disabled=!cell||cell.state!=='metal'||!validPayment||quoteBlocked;
  const price=cell?.state==='metal'?(family==='DIG'?PICKAXE_PRICE[cell.kind]:payment==='DIG'?DIG_ALTERNATIVES[family][cell.kind]:NATIVE_PRICES[family][cell.kind]):0;
  $('pickaxe').textContent=cell?.state==='metal'?validPayment?`${family} ${names[cell.kind]} pickaxe · ${fmt(price)} ${payment}${quoteBlocked?' · quote unavailable':''}`:'Choose a supported payment currency':'Pickaxe · select discovered metal';
  $('pickaxe-preview').replaceChildren();if(cell?.state==='metal'){const file=asset(`pickaxe.${family.toLowerCase()}.${cell.kind}.card`);if(file){const img=document.createElement('img');img.src=file;img.alt=`Approved ${family} ${cell.kind} pickaxe`;img.loading='lazy';$('pickaxe-preview').append(img);}}
  $('light').disabled=!cell||cell.state!=='covered'||cell.light;
  $('detector').disabled=game.info.detector!==null;
  $('scanner').disabled=!cell||Object.hasOwn(game.info.rows,Math.floor(selected/5));
  $('finder').disabled=Boolean(game.info.finder);$('finder').title='Open Crystal Finder in Shop and enter simulated USD prices.';
  for(const [id,kind]of [['small-charge','smallCharge'],['power-strike','powerStrike'],['drill','drill'],['dynamite','dynamite']]){const ready=bulkReadiness(game,kind,bulkSelection(kind));$(id).disabled=false;$(id).title=ready.valid?'Confirm purchase and use':ready.reason+' Tap to choose targets.';$(id).dataset.targetReady=String(ready.valid);}
  $('bulk-target-controls').hidden=!bulkMode;
  if(bulkMode){const spec=BULK_TOOLS[bulkMode],ready=bulkReadiness(game,bulkMode,bulkSelection(bulkMode));$('target').textContent=spec.label+' · '+ready.reason;$('bulk-use').textContent='Use '+spec.label+' · '+spec.price;$('bulk-use').disabled=!ready.valid;$('dig').disabled=true;$('pickaxe').disabled=true;}
  $('bulk-equipment-help').textContent=bulkMode?BULK_TOOLS[bulkMode].label+' · '+bulkReadiness(game,bulkMode,bulkSelection(bulkMode)).reason:'Choose a tool to select its targets. Excavated blocks cannot be included; no payment until confirmation.';
  $('info').replaceChildren();
  const info=[];
  if(game.info.detector!==null)info.push(`Depth detector: ${game.info.detector?'metal remains':'no undiscovered metal'}`);
  for(const [row,present] of Object.entries(game.info.rows))info.push(`Row ${Number(row)+1}: ${present?'metal present':'no undiscovered metal'}`);
  $('info').textContent=info.join(' · ');
  if(game.info.finder)$('info').textContent+=game.info.finder.status==='none'?' · NO CRYSTALS DETECTED':` · ${game.info.finder.status==='multiple'?'MULTIPLE CRYSTALS ARE PRESENT · highest simulated value: ':''}${game.info.finder.asset} crystal: row ${Math.floor(game.info.finder.index/5)+1}, column ${game.info.finder.index%5+1}`;
  $('shards').textContent=`Shards · DIG ${game.shards.DIG.length}/10 · FENN ${game.shards.FENN.length}/10`;
  $('crystals').replaceChildren();
  for(const crystal of game.crystals.filter(x=>x.state==='owned')) {
    const div=document.createElement('div');div.className='inventory-item';
    const text=document.createElement('span');text.textContent=`Owned ${crystal.asset} ${crystal.origin==='shards'?'shard-formed ':''}crystal`;
    div.append(text);
    if(game.crystalRewardsVersion!==1&&crystal.origin==='whole'&&(crystal.asset==='DIG'||crystal.nativeNominal)){
      const button=document.createElement('button');button.textContent=`Break and settle simulated ${crystal.asset}`;button.onclick=()=>run('breakCrystal',{crystalId:crystal.id});div.append(button);
    } else { const hint=document.createElement('p');hint.className='hint';hint.textContent=crystal.settlementHold||'Owned right retained. Settlement policy/controller pending.';div.append(hint); }
    $('crystals').append(div);
  }
  if(!$('crystals').childElementCount)$('crystals').textContent='No owned crystals yet.';
  $('supplemental').textContent=`${game.supplemental.length} historical native discoveries held. Native pool forecasting is automatic; historical fallback and unsupported shard provenance remain held.`;
  for(const token of ['FENN','NOMO']){const c=game.controllers[token],f=c.forecast;if(f)$('pool-'+token).textContent=`${fmt(balance(game,token,'vault'))} · ${c.paused?'PAUSED':c.rate+'% yield'} · ${fmt(Math.floor(f.expectedDigs))} expected digs · ${f.exposure.samples}/256 metal samples`;}
  renderShop();
  refreshChoices();
  $('activity').replaceChildren();
  for(const entry of game.history.slice(0,8)){const li=document.createElement('li');li.textContent=entry.text;$('activity').append(li);}
  renderBoard();
}
$('buy-shovels').onclick=()=>run('buyShovels',{count:Number($('pack').value)});
$('free').onclick=()=>run('free');
$('scene-free').onclick=()=>run('free');
$('buy-pass').onclick=()=>confirmAction('Buy a DIG Boost Pass?', `Payment: DIG only. Boost Mode applies only to the DIG reward pool. 260,000 DIG for 250 eligible future covered positions. Digging costs extra. NO REFUNDS. Uses carry forward; activation, timing, utilization and profit are not guaranteed. Current vault: ${fmt(game.vault)} actual, ${fmt(game.reserved)} reserved, ${fmt(spendable(game))} spendable. Activation 114,063,300; exit 100,000,000; five-minute post-event cooldown. Allocation: 104,000 pool, 91,000 treasury, 39,000 burn, 13,000 each Oso/Bebe. Covered DIG 90%; normal FENN/NOMO yields and pauses stay unchanged. Oso/Bebe equipment allowances are separate from Boost Mode.`,()=>run('buyPass',{currency:'DIG',asset:'DIG',acceptNoRefunds:true}));
$('dig').onclick=()=>run('dig',{index:selected});
$('pickaxe').onclick=()=>{
 const family=$('reward-family').value,currency=$('pay-currency').value,cell=game.board[selected];if(!cell||cell.state!=='metal')return;
 const price=family==='DIG'?PICKAXE_PRICE[cell.kind]:currency==='DIG'?DIG_ALTERNATIVES[family][cell.kind]:NATIVE_PRICES[family][cell.kind];
 const minima={DIG:{copper:4000,silver:8000,gold:16000,platinum:35000},FENN:{copper:5000000,silver:10000000,gold:20000000,platinum:40000000},NOMO:{copper:0.025,silver:0.025,gold:0.05,platinum:0.10}},maximum={DIG:75000,FENN:80000000,NOMO:0.2},yieldRate=family==='DIG'?cell.rate:game.controllers[family].rate;
 confirmAction(`Use the ${family} ${cell.kind} pickaxe?`,`${fmt(price)} ${currency}. Possible ${family} payout: ${fmt(minima[family][cell.kind]*yieldRate/100)}–${fmt(maximum[family]*yieldRate/100)} at current ${yieldRate}% yield. No profit guarantee; excavation and any Boost pass cost extra. Metal gets no shovel bonus. Fees fund only ${currency}; no automatic conversion.`,()=>run('pickaxe',{index:selected,family,currency}));
};
$('reward-family').onchange=()=>{$('pay-currency').value=$('reward-family').value;render();};$('pay-currency').onchange=()=>render();
$('light').onclick=()=>run('light',{index:selected});
$('detector').onclick=()=>run('detector');
$('scanner').onclick=()=>run('scanner',{row:Math.floor(selected/5)});
$('finder').onclick=()=>{closeGamePanels();document.querySelector('.scene-nav-shop').click();approvedShop.show('information');approvedShop.select(approvedShop.catalogue('information').find(i=>i.key==='finder'));};
function bulkSelection(kind){return kind==='smallCharge'?{indices:[...chargeTargets]}:{index:selected};}
function beginBulkTargeting(kind){bulkMode=kind;chargeTargets=[];$('charge-mode').checked=kind==='smallCharge';closeGamePanels();render();$('target').scrollIntoView({block:'nearest',behavior:'instant'});}
function requestEquipment(kind){const data=bulkSelection(kind);if(bulkReadiness(game,kind,data).valid)confirmBulk(kind,data);else beginBulkTargeting(kind);}
for(const [id,kind]of [['small-charge','smallCharge'],['power-strike','powerStrike'],['drill','drill'],['dynamite','dynamite']])$(id).onclick=()=>requestEquipment(kind);
$('bulk-use').onclick=()=>{if(bulkMode)confirmBulk(bulkMode,bulkSelection(bulkMode));};
$('bulk-cancel').onclick=()=>{bulkMode=null;chargeTargets=[];$('charge-mode').checked=false;render();};
$('charge-mode').onchange=()=>{chargeTargets=[];bulkMode=$('charge-mode').checked?'smallCharge':null;render();};
for(const native of ['FENN','NOMO'])$(`claim-${native}`).onclick=()=>run('claimRewards',{asset:native});
$('depth-pass').onclick=()=>run('depthPass');
$('descend').onclick=()=>confirmAction('Close this depth?', 'This depth cannot reopen. Unexcavated positions and unresolved metal are abandoned. Owned crystals, shards, held discoveries, shovels, and unused Boost coverage persist.',()=>{selected=null;run('descend',{confirmed:true});});
$('claim-rewards').onclick=()=>run('claimRewards');
$('deposit').onclick=()=>run('deposit',{amount:20000000});
$('deposit-FENN').onclick=()=>run('deposit',{asset:'FENN',amount:1000000000});$('deposit-NOMO').onclick=()=>run('deposit',{asset:'NOMO',amount:10});
$('link-wallet').onclick=()=>{const id=$('wallet-id').value.trim();if(id)run('linkWallet',{walletId:id});};
$('wallet-selection').onchange=()=>run('selectWallet',{walletId:$('wallet-selection').value});
function confirmBulk(kind,data){try{const ready=bulkReadiness(game,kind,data);if(!ready.valid)throw Error(ready.reason);const indices=ready.indices,price={smallCharge:'13,500 DIG',powerStrike:'18,000 DIG',drill:'45,000 DIG',dynamite:'0.05 NOMO'}[kind];confirmAction(`Use ${kind}?`,`${price} for ${indices.length} covered positions: ${indices.map(i=>`${Math.floor(i/5)+1}:${i%5+1}`).join(', ')} (row:column). Every target and settlement must validate; failure rolls back the whole purchase. Metal remains unresolved until its matching pickaxe. Inventory shovels are not consumed; Boost coverage uses one eligible position at a time.`,()=>run('bulk',{kind,...data}).then(()=>{chargeTargets=[];render();}));}catch(error){message(error.message,true);}}
$('sound-toggle').onclick=()=>{const on=presentation.enableSound();$('sound-toggle').textContent=on?'Sound on · new effect preview':'Sound off · new effect preview';$('sound-toggle').setAttribute('aria-pressed',String(on));};
function renderShop(){
 const signature=JSON.stringify([game.equipped,game.cosmetics,game.plates,game.equippedPlate,game.mythics,game.releaseStock,game.account.wallets.map(w=>w.id),game.account.receivingWallet,game.nftSandbox,game.nftEquipped,nftShop.enabled,Object.keys(bindings),Object.keys(candidateBindings)]);
 if(signature===shopFingerprint)return;shopFingerprint=signature;
 const shop=$('shovel-shop');shop.replaceChildren();
 for(const [key,price] of Object.entries(COSMETICS)){
  const card=document.createElement('div');card.className='shop-card';
  const file=asset(`shovel.${key}.card`);if(file)card.append(approvedArtwork(bindings[`shovel.${key}.card`]||{file},`${key} cosmetic`));
  const button=document.createElement('button'),owned=game.cosmetics.includes(key);
  button.textContent=owned?`${game.equipped===key?'Equipped':'Equip'} ${key}`:`${key} · ${fmt(price)} DIG`;
  button.disabled=game.equipped===key;button.onclick=()=>owned?run('equip',{key}):confirmAction('Buy a permanent cosmetic?',`${key} · ${fmt(price)} DIG. Cosmetic only; no actions, odds or reward bonus.`,()=>run('buyCosmetic',{key}));card.append(button);shop.append(card);
 }
 const plates=$('plate-shop');plates.replaceChildren();
 for(const [key,price] of Object.entries(PLATES)){
  const card=document.createElement('div');card.className='shop-card';card.append(platePreview(key));
  const owned=game.plates.includes(key),button=document.createElement('button');button.textContent=owned?`${game.equippedPlate===key?'Equipped':'Equip'} ${key} plate`:`${key} plate · ${fmt(price)} DIG`;button.disabled=game.equippedPlate===key;
  button.onclick=()=>owned?run('equipPlate',{key}):confirmAction('Buy a decorative plate?',`${key} standalone plate · ${fmt(price)} DIG. Permanent cosmetic only; no actions or reward bonus. Allocation: 90% DIG pool, 5% Oso, 5% Bebe. NEW ART AWAITING REVIEW.`,()=>run('buyPlate',{key}));card.append(button);plates.append(card);
 }
 const removePlate=document.createElement('button');removePlate.textContent='Remove decorative plate';removePlate.disabled=!game.equippedPlate;removePlate.onclick=()=>run('equipPlate',{key:null});plates.append(removePlate);
 nftShop.render();
 $('allowances').textContent='Historical simulated records are preserved; legacy allowances and recharges do not authorize NFT utility. No real NFT migration has been performed.';
 const wallets=$('wallet-selection'),choices=$('wallet-selection-choices');choices.replaceChildren();for(const wallet of game.account.wallets){const option=document.createElement('button');option.type='button';option.dataset.value=wallet.id;option.textContent=wallet.id;choices.append(option);}wallets.value=game.account.receivingWallet;
}
function platePreview(key){const wrapper=document.createElement('div');wrapper.className='plate-preview';const file=asset('plate.'+key);if(file){const img=document.createElement('img');img.src=file;img.alt=key+' new decorative plate';img.loading='lazy';wrapper.append(img);if(['DIG','FENN','NOMO'].includes(key)){const coin=document.createElement('span');coin.className='coin-face';coin.dataset.token=key;wrapper.append(coin);}}const label=document.createElement('small');label.textContent='NEW ART · REVIEW';wrapper.append(label);return wrapper;}
async function presentAction(type,data,previous,next,revealTicket){
 // Presentation only; authorized engine state and saved receipt already committed.
 const indices=type==='bulk'?bulkTargets(data.kind,data):Number.isInteger(data.index)?[data.index]:[];
 const tool=type==='pickaxe'?asset(`pickaxe.${(data.family||'DIG').toLowerCase()}.${previous.board[data.index].kind}.sprite`):data.kind==='drill'?asset('tool.fenn_drill'):data.kind==='dynamite'?asset('tool.nomo_dynamite'):data.kind==='powerStrike'?asset('fx.power_strike'):data.kind==='smallCharge'?asset('tool.small_charge'):asset(`shovel.${game.mythics[game.equipped]?.brand||game.equipped}.sprite`);
 const region=type==='dig'?candidateBindings[`shovel.${game.mythics[game.equipped]?.brand||game.equipped}.sprite`]?.region:null;
 try{await presentation.present(type,{...data,indices,toolRegion:region},next,tool);}finally{rewardReveals.show(revealTicket);}
}
window.addEventListener('storage',event=>{if(event.key===SAVE&&event.newValue){try{game=JSON.parse(event.newValue);render();}catch{message('Another tab produced an unreadable save. Reload after resolving it.',true);}}});
// The approved board is essential. Optional effect maps cannot prevent its setup.
$('board').dataset.layout='approved';$('board').dataset.surface='full-approved';document.body.classList.add('full-board');
// Complete restore/migration persistence before exposing interactive cells.
restorePoolEmblems();
const cleanBoardReady=restoreCleanBoard($('board-clean-underlay'),boardLayout);
save(game);
render();
try {
  const response=await fetch('./assets/bindings.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Missing asset bindings.');
  bindings=(await response.json()).assets||{};
  for(const node of document.querySelectorAll('[data-art-id]')){const file=asset(node.dataset.artId);if(file){const img=document.createElement('img');img.src=file;img.alt='';img.className='control-art';img.loading='lazy';img.decoding='async';node.prepend(img);}}
  const count=Object.values(bindings).filter(x=>x.sourceVerified===true).length;
  if(count)$('art-status').textContent=`${count} original asset bindings available. Missing visuals remain explicitly labeled placeholders; new UI remains a development treatment.`;
} catch { message('Asset map unavailable. Temporary labeled visuals retained.',true); }
render();
try {
  const candidateResponse=await fetch('./assets/candidate-bindings.json',{cache:'no-store'});if(candidateResponse.ok)candidateBindings=(await candidateResponse.json()).assets||{};
  render();
  await presentation.load();
} catch {message('Optional effect previews unavailable; approved board and mining remain available.',true);}
await approvedShop.load().catch(error=>message(error.message,true));
await cleanBoardReady;
document.body.dataset.runtimeReady='true';
await run('tick',{resumeFusions:true}); // Resume a persisted reward without replaying or rerolling it.
mobileView.addEventListener('change',()=>render());
// Timer evaluation is local simulation, not a live economic service.
setInterval(()=>{
  if(document.hidden||busy)return;
  const before=JSON.stringify([game.boost,game.controllers]);
  const next=act(game,{type:'tick',id:transactionId()});
  if(JSON.stringify([next.boost,next.controllers])!==before)run('tick');
  else renderTimeStatus();
},1000);
