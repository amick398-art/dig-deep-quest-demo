// Owner-approved DIG runtime, 15 October 2026. Original engine.mjs remains the recovery checkpoint.
// Simulation only: no live wallet calls. Native and metal/crystal nominal tables remain unchanged.
export const RULES = Object.freeze({
  version: 'C29-W4-W5-W6', economyVersion: 'DIG-2026-10-15-R1', columns: 5, rows: 10, descent: 35,
  digSupply: 1_000_000_000, cap: 30_000_000,
  shovelPrice: 4500, passPrice: 52000, passUses: 50,
  entry: 114063300, exit: 100000000, cooldown: 300000,
  freeGate: 500000, freeInterval: 86400000,
});
export const JOINT = Object.freeze([
  ['DIG', 1360], ['FENN', 600], ['shard', 760], ['shovel', 400],
  ['crystal', 40], ['NOMO', 40], ['empty', 520],
  ['copper', 160], ['silver', 80], ['gold', 30], ['platinum', 10],
]); // Denominator 4000; exactly the R04 joint table.
// Owner-approved ordinary DIG odds; denominator 6000 preserves exact recurring thirds.
const PRESERVED_METAL_LADDER = [[1000,1100],[4000,600],[8000,220],[16000,60],[35000,19],[75000,1]];
export const DIG_LADDER = [[2000,2700],[5000,2000],[8000,860],[16000,380],[35000,57],[75000,3]];
export const FENN_LADDER = [[2500000,1100],[5000000,600],[10000000,220],[20000000,60],[40000000,19],[80000000,1]];
export const NOMO_LADDER = [[0.025,719],[0.05,600],[0.1,400],[0.15,200],[0.175,80],[0.2,1]];
export const DIG_CRYSTAL = [[3000,143],[6000,120],[10000,80],[15000,40],[20000,16],[25000,1]];
export const METALS = ['copper','silver','gold','platinum'];
export const PICKAXE_PRICE = { copper:8000, silver:13500, gold:25000, platinum:54000 };
const MINIMUM = { copper:4000, silver:8000, gold:16000, platinum:35000 };

export function random() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0] / 4294967296;
}
export function weighted(table, rng = random) {
  const total = table.reduce((sum, row) => sum + row[1], 0);
  const value = rng();
  if (!(value >= 0 && value < 1)) throw new Error('Invalid random sample.');
  let ticket = Math.floor(value * total);
  for (const [outcome, weight] of table) {
    if (ticket < weight) return outcome;
    ticket -= weight;
  }
  throw new Error('Invalid probability table.');
}
export function metalTable(kind) {
  const minimum = MINIMUM[kind];
  if (!minimum) throw new Error('Unknown metal tier.');
  const table = PRESERVED_METAL_LADDER.filter(([amount]) => amount >= minimum).map(row => [...row]);
  table[0][1] += PRESERVED_METAL_LADDER.filter(([amount]) => amount < minimum).reduce((sum,row) => sum + row[1], 0);
  return table;
}
export function makeBoard(rng = random) {
  return Array.from({length:50}, (_, index) => {
    const kind = weighted(JOINT, rng);
    const cell = { index, kind, state:'covered', light:false, covered:false, rate:75, reserve:0 };
    // All hidden outcomes are fixed at depth creation, not rerolled by information tools.
    if (kind === 'DIG') cell.nominal = weighted(DIG_LADDER, rng);
    if (kind === 'FENN') cell.nominal = weighted(FENN_LADDER, rng);
    if (kind === 'NOMO') cell.nominal = weighted(NOMO_LADDER, rng);
    if (METALS.includes(kind)) cell.nominal = weighted(metalTable(kind), rng);
    if (kind === 'shard') cell.asset = weighted([['DIG',3],['FENN',1]], rng);
    if (kind === 'crystal') {
      cell.asset = weighted([['DIG',152],['FENN',47],['NOMO',1]], rng);
      if (cell.asset === 'DIG') cell.nominal = weighted(DIG_CRYSTAL, rng);
    }
    return cell;
  });
}
export function createGame(rng = random) {
  return {
    schema:1, version:RULES.version, digEconomyVersion:RULES.economyVersion, digBoardRulesVersion:RULES.economyVersion, depth:1, board:makeBoard(rng),
    // Player money is a clearly disclosed test fixture, not a C29 endowment rule.
    wallet:2000000, profileRewards:0, earned:0, shovels:0,
    pass:{ purchased:0, used:0, remaining:0 },
    vault:100000000, reserved:0, treasury:0,
    buckets:{ burn:0, liquidity:0, oso:0, bebe:0 },
    boost:{ active:false, id:0, endedAt:null, startedAt:null },
    shards:{ DIG:[], FENN:[] }, crystals:[], supplemental:[],
    earlyDescent:false, lastFreeClaim:null, info:{ detector:null, rows:{} },
    transactions:[], history:[], closedDepths:[],
  };
}
export const spendable = s => s.vault - s.reserved;
export const resolved = s => s.board.filter(cell => cell.state === 'resolved').length;
function log(s, text) { s.history.unshift({text}); s.history = s.history.slice(0,100); }
function assertAmount(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid DIG amount.');
}
function reserve(s, amount) {
  if (spendable(s) < amount) throw new Error('Insufficient funded DIG for this obligation. No changes made.');
  s.reserved += amount;
}
function route(s, amount) {
  assertAmount(amount);
  const direct = Math.min(amount, Math.max(0, RULES.cap - s.wallet));
  s.wallet += direct;
  s.profileRewards += amount - direct;
  s.earned += amount;
  log(s, `${amount.toLocaleString()} simulated DIG earned${amount > direct ? '; overflow held in simulated profile Rewards' : ''}.`);
}
function settle(s, amount, heldReserve = 0) {
  if (s.vault - (s.reserved - heldReserve) < amount) throw new Error('DIG settlement is not fully funded.');
  s.reserved -= heldReserve;
  s.vault -= amount;
  route(s, amount);
}
function purchase(s, price, allocation = 'ordinary') {
  assertAmount(price);
  if (s.wallet < price) throw new Error('Insufficient simulated DIG balance.');
  s.wallet -= price;
  if (allocation === 'boost') {
    s.vault += price * .4;
    s.treasury += price * .35;
    s.buckets.burn += price * .15;
  } else {
    s.vault += price * .65;
    s.treasury += price * .05;
    s.buckets.burn += price * .1;
    s.buckets.liquidity += price * .1;
  }
  s.buckets.oso += price * .05;
  s.buckets.bebe += price * .05;
}
export function updateBoost(s, now) {
  if (s.boost.active) {
    if (spendable(s) <= RULES.exit) {
      s.boost.active = false;
      s.boost.endedAt = now;
      log(s, 'Boost ended. Unused pass coverage carries forward; five-minute cooldown started.');
    }
    return;
  }
  if (s.boost.endedAt !== null && now - s.boost.endedAt < RULES.cooldown) return;
  const needed = Math.max(0, RULES.entry - spendable(s));
  if (s.treasury < needed) return;
  s.treasury -= needed;
  s.vault += needed;
  s.boost.active = true;
  s.boost.id++;
  s.boost.startedAt = now;
  log(s, `Boost ${s.boost.id} activated; exactly ${needed.toLocaleString()} simulated treasury DIG injected.`);
}
function target(s, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 50) throw new Error('Choose a valid board position.');
  return s.board[index];
}
function excavate(s, index) {
  const cell = target(s, index);
  if (cell.state !== 'covered') throw new Error('This position has already been excavated.');
  if (s.shovels < 1) throw new Error('Buy shovels or claim your eligible daily pair first.');
  const covered = s.boost.active && s.pass.remaining > 0;
  cell.covered = covered;
  cell.economyVersion = RULES.economyVersion;
  cell.rate = covered ? 100 : 75;
  if (cell.kind === 'DIG') settle(s, cell.nominal * cell.rate / 100);
  else if (METALS.includes(cell.kind)) {
    // Protect the recorded payable amount in this narrow DIG-family demo.
    cell.reserve = cell.nominal * cell.rate / 100;
    reserve(s, cell.reserve);
    cell.state = 'metal';
  } else if (cell.kind === 'shovel') s.shovels++;
  else if (cell.kind === 'FENN' || cell.kind === 'NOMO') {
    s.supplemental.push({id:`${s.depth}:${index}`, asset:cell.kind, nominal:cell.nominal, depth:s.depth, index, version:s.version, status:'held-for-native-controller'});
    log(s, `${cell.kind} discovery held; native settlement controller is not enabled in this slice.`);
  } else if (cell.kind === 'crystal') {
    const amount = cell.asset === 'DIG' ? cell.nominal * cell.rate / 100 : 0;
    if (amount) reserve(s, amount);
    s.crystals.push({ id:`${s.depth}:${index}`, asset:cell.asset, amount, rate:cell.rate, reserve:amount, state:'owned', origin:'whole', version:s.version });
    log(s, `Owned ${cell.asset} crystal saved to inventory.`);
  } else if (cell.kind === 'shard') {
    // Preserve each shard's coverage provenance; do not enable the nonbinding
    // weighted-shard settlement proposal as though it were an approved rule.
    const amount = cell.asset === 'DIG' ? 1875 + (covered ? 625 : 0) : 0;
    if (amount) reserve(s, amount);
    s.shards[cell.asset].push({ covered, reserve:amount, depth:s.depth, index, version:s.version, economyVersion:RULES.economyVersion });
    if (s.shards[cell.asset].length >= 10) {
      const shards = s.shards[cell.asset].splice(0,10);
      s.crystals.push({id:`shards:${s.depth}:${index}`,asset:cell.asset,origin:'shards',shards,reserve:shards.reduce((n,x)=>n+x.reserve,0),state:'owned',version:s.version});
      log(s, `Ten ${cell.asset} shards formed an owned crystal; settlement policy pending.`);
    }
  }
  s.shovels--;
  if (covered) { s.pass.remaining--; s.pass.used++; }
  if (cell.state !== 'metal') cell.state = 'resolved';
  log(s, `Depth ${s.depth}, row ${Math.floor(index/5)+1}, column ${index%5+1}: ${cell.kind}.`);
}
export function act(current, action, { now=Date.now(), rng=random } = {}) {
  if (!action.id || typeof action.id !== 'string') throw new Error('A unique transaction ID is required.');
  if (current.transactions.includes(action.id)) return current;
  // Mutate a private snapshot; all validation/payment/grants commit together.
  const s = migrateDigEconomy(structuredClone(current));
  updateBoost(s, now);
  switch (action.type) {
    case 'tick': break;
    case 'buyShovels': {
      if (![1,5,10,25,50].includes(action.count)) throw new Error('Invalid shovel pack.');
      purchase(s, action.count * RULES.shovelPrice);
      s.shovels += action.count;
      log(s, `Purchased ${action.count} shovels at 4,500 simulated DIG each.`);
      break;
    }
    case 'free':
      if (s.wallet < RULES.freeGate) throw new Error('The designated demo wallet must hold at least 500,000 DIG.');
      if (s.lastFreeClaim !== null && now - s.lastFreeClaim < RULES.freeInterval) throw new Error('Daily claim becomes available 24 hours after the previous claim.');
      s.shovels += 2; s.lastFreeClaim = now; log(s,'Claimed two daily free shovels.'); break;
    case 'buyPass':
      if (!action.acceptNoRefunds) throw new Error('Acknowledge NO REFUNDS before purchasing.');
      purchase(s, RULES.passPrice, 'boost');
      s.pass.purchased += RULES.passUses; s.pass.remaining += RULES.passUses;
      log(s, 'Purchased 50 future covered positions. Digging sold separately. NO REFUNDS.'); break;
    case 'dig': excavate(s, action.index); break;
    case 'pickaxe': {
      const cell = target(s, action.index);
      if (cell.state !== 'metal' || !METALS.includes(cell.kind)) throw new Error('Excavate a metal position before using its matching pickaxe.');
      if (action.family !== 'DIG') throw new Error('FENN/NOMO pickaxe settlements are pending their native controllers.');
      purchase(s, PICKAXE_PRICE[cell.kind]);
      settle(s, cell.nominal * cell.rate / 100, cell.reserve);
      cell.reserve = 0; cell.state = 'resolved';
      log(s, `${cell.kind} resolved with its DIG-family pickaxe.`); break;
    }
    case 'light': {
      const cell = target(s, action.index);
      if (cell.state !== 'covered' || cell.light) throw new Error('Choose an unlit, covered position.');
      purchase(s, 2000); cell.light = true; log(s,'Miner’s Light revealed one position; it still requires excavation.'); break;
    }
    case 'detector':
      if (s.info.detector !== null) throw new Error('Detector information already persists for this depth.');
      purchase(s, 3000);
      s.info.detector = s.board.some(cell => cell.state === 'covered' && !cell.light && METALS.includes(cell.kind));
      log(s, s.info.detector ? 'Undiscovered metal remains in this depth.' : 'No undiscovered metal remains in this depth.'); break;
    case 'scanner': {
      if (!Number.isInteger(action.row) || action.row < 0 || action.row > 9) throw new Error('Choose a valid row.');
      if (Object.hasOwn(s.info.rows,action.row)) throw new Error('Scanner information already persists for this row.');
      purchase(s, 4000);
      s.info.rows[action.row] = s.board.slice(action.row*5,action.row*5+5).some(cell => cell.state === 'covered' && !cell.light && METALS.includes(cell.kind));
      log(s, `Row ${action.row+1}: ${s.info.rows[action.row] ? 'undiscovered metal present' : 'no undiscovered metal'}.`); break;
    }
    case 'depthPass':
      if (s.earlyDescent || resolved(s) >= RULES.descent) throw new Error('Descent is already unlocked.');
      purchase(s, 10000); s.earlyDescent = true; log(s,'Early descent unlocked. Confirm when ready.'); break;
    case 'descend':
      if (!action.confirmed) throw new Error('Confirm depth closure before descending.');
      if (!s.earlyDescent && resolved(s) < RULES.descent) throw new Error('Resolve 35 positions or purchase a Depth Pass.');
      // Abandon unresolved metal, retaining inventory crystals and shard rights.
      s.reserved -= s.board.reduce((sum, cell) => sum + cell.reserve, 0);
      s.closedDepths.push(s.depth); s.depth++; s.board = makeBoard(rng);s.digBoardRulesVersion=RULES.economyVersion;
      s.earlyDescent = false; s.info = {detector:null,rows:{}};
      log(s, `Descended to depth ${s.depth}; previous depth permanently closed.`); break;
    case 'breakCrystal': {
      const crystal = s.crystals.find(x => x.id === action.crystalId);
      if (!crystal || crystal.state !== 'owned') throw new Error('Choose an owned crystal.');
      if (crystal.asset !== 'DIG' || crystal.origin !== 'whole') throw new Error('This crystal is held pending its settlement policy/controller.');
      settle(s, crystal.amount, crystal.reserve); crystal.reserve = 0; crystal.state = 'claimed'; break;
    }
    case 'claimRewards': {
      const amount = Math.min(s.profileRewards, Math.max(0, RULES.cap - s.wallet));
      if (amount <= 0) throw new Error('No claimable balance within the wallet’s 3% headroom.');
      s.wallet += amount; s.profileRewards -= amount;
      log(s, `Claimed ${amount.toLocaleString()} simulated profile Rewards.`); break;
    }
    case 'deposit':
      assertAmount(action.amount); s.vault += action.amount;
      log(s, `Fixture funder deposited ${action.amount.toLocaleString()} simulated DIG; 100% credited to the vault.`); break;
    default: throw new Error('Unknown demo action.');
  }
  updateBoost(s, now);
  if (s.vault < s.reserved || s.reserved < 0 || s.wallet < 0 || s.pass.remaining < 0) throw new Error('Accounting invariant failed.');
  s.transactions.push(action.id);
  return s;
}

export function publicBoard(s) {
  // DOM and tooltips never expose hidden outcomes or amounts of covered positions.
  return s.board.map(cell => {
    const visible = cell.state !== 'covered' || cell.light;
    return {index:cell.index,state:cell.state,light:cell.light,covered:cell.covered,
      kind:visible ? cell.kind : null,asset:visible ? cell.asset : null};
  });
}

// Preserve every earned right and purchased legacy use. Never reroll a saved board.
export function migrateDigEconomy(s) {
  if(s.digEconomyVersion===RULES.economyVersion)return s;
  for(const c of s.board||[])if(c.kind==='DIG'&&c.state==='covered') {
    if(c.nominal===1000)c.nominal=2000;else if(c.nominal===4000)c.nominal=5000;
  }
  s.digBoardRulesVersion??='legacy-fixed-outcomes';
  s.digEconomyVersion=RULES.economyVersion;
  return s;
}
