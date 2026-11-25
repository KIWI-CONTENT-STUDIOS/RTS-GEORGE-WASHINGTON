import { FACTIONS, UNIT_STATS, UNIT_TYPES } from './config.js';
import { createCampaignMap } from './campaign.js';
import { TravellingArmy } from './models.js';
import { mergeRosters, rosterCount } from './gameRules.js';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const panel = document.querySelector('#city-panel');
const wrap = document.querySelector('.map-wrap');
const campaign = createCampaignMap();
const cityById = new Map(campaign.cities.map(city => [city.id, city]));
const state = {
  year: 1775, money: 450, selectedCityId: 'philadelphia', armies: [], battle: null,
  incomeClock: 0, incomePeriod: 15, recruitments: [], selectedUnits: new Set(), mouseDown: null,
  lastEventYear: 1775,
};
const MAP = { width: 1000, height: 820 };
let width = 0, height = 0, lastFrame = 0, toastTimer;

function transform() {
  const scale = Math.min(width / MAP.width, height / MAP.height);
  return { scale, x: (width - MAP.width * scale) / 2, y: (height - MAP.height * scale) / 2 };
}
function screenPoint(city) { const t = transform(); return { x: t.x + city.x * t.scale, y: t.y + city.y * t.scale }; }
function worldPoint(x, y) { const t = transform(); return { x: (x - t.x) / t.scale, y: (y - t.y) / t.scale }; }
function resize() {
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
}
function announce(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
}
function rosterTotal(faction) {
  const cities = campaign.cities.filter(city => city.owner === faction).reduce((sum, city) => sum + city.soldierCount, 0);
  const travel = state.armies.filter(army => army.owner === faction).reduce((sum, army) => sum + army.soldierCount, 0);
  const fighting = state.battle ? state.battle.units.filter(unit => unit.owner === faction && unit.health > 0).length : 0;
  return cities + travel + fighting;
}
function updateHeader() {
  document.querySelector('#american-count').textContent = rosterTotal(FACTIONS.AMERICAN);
  document.querySelector('#british-count').textContent = rosterTotal(FACTIONS.BRITISH);
  document.querySelector('#money-count').textContent = state.money;
  document.querySelector('#year-label').textContent = `Campaign · ${state.year}`;
}
function refresh() { updateHeader(); renderPanel(); draw(); }
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function renderPanel() {
  if (state.battle) { renderBattlePanel(); return; }
  const city = cityById.get(state.selectedCityId);
  if (!city) { panel.innerHTML = '<div class="empty-state"><span class="eyebrow">CAMPAIGN MAP</span><h1>Select a settlement</h1><p>Click a town on the map to inspect its local garrison and issue orders.</p></div>'; return; }
  const isAmerican = city.owner === FACTIONS.AMERICAN;
  const ownerName = isAmerican ? 'Continental' : 'Crown';
  const rows = Object.entries(city.garrison).filter(([, n]) => n > 0).map(([type, n]) => `<div class="garrison-row"><span>${esc(type)}</span><strong>${n}</strong></div>`).join('') || '<p class="muted">No soldiers are stationed here.</p>';
  const pending = state.recruitments.filter(job => job.cityId === city.id);
  const pendingHtml = pending.map(job => `<div class="army-card">Recruiting ${esc(job.type)} · ${Math.ceil(job.remaining)}s</div>`).join('');
  const troopOptions = Object.entries(city.garrison).filter(([, n]) => n > 0).map(([type, n]) => `<option value="${esc(type)}">${esc(type)} (${n})</option>`).join('');
  const destinations = campaign.cities.filter(target => target.id !== city.id && (target.owner === FACTIONS.AMERICAN || isAmerican));
  const selectHtml = destinations.map(target => `<option value="${target.id}">${esc(target.name)}${target.owner === FACTIONS.BRITISH ? ' — Crown' : ''}</option>`).join('');
  const recruitButtons = Object.values(UNIT_TYPES).map(type => {
    const stats = UNIT_STATS[type];
    const localPending = pending.filter(job => job.status !== 'ready').length;
    const disabled = !isAmerican || state.money < stats.cost || city.soldierCount + localPending >= city.recruitmentCapacity;
    return `<button type="button" class="recruit-button" data-recruit="${esc(type)}" ${disabled ? 'disabled' : ''}>${esc(type)}<br>£${stats.cost} · ${stats.time}s</button>`;
  }).join('');
  const transfer = isAmerican && troopOptions ? `<h2>Move troops</h2><div class="panel-card"><label for="move-type">Soldier class</label><select id="move-type">${troopOptions}</select><label for="move-count">Number to send</label><input id="move-count" type="number" min="1" value="1" max="${city.soldierCount}"><label for="move-destination">Destination</label><select id="move-destination"><option value="">Choose settlement…</option>${selectHtml}</select><button id="dispatch" class="panel-button secondary" type="button">Dispatch force</button></div>` : '';
  const armyCards = state.armies.filter(a => a.originId === city.id || a.destinationId === city.id).map(a => {
    const origin = cityById.get(a.originId), destination = cityById.get(a.destinationId);
    return `<div class="army-card"><strong>${a.originId === city.id ? `To ${esc(destination.name)}` : `From ${esc(origin.name)}`}</strong><br>${a.soldierCount} soldiers · ${Math.round(a.progress * 100)}% en route</div>`;
  }).join('');
  panel.innerHTML = `<span class="eyebrow">SETTLEMENT RECORD</span><h1>${esc(city.name)}</h1><span class="owner-tag ${isAmerican ? 'american' : 'british'}">${ownerName} control</span><div class="city-meta">Income: £${city.income} each campaign period<br>Garrison: ${city.soldierCount} / ${city.recruitmentCapacity}</div><h2>Local garrison</h2><p class="muted">Only troops stationed here can defend this town or depart from it.</p>${rows}${pending.length ? `<h2>Recruiting locally</h2>${pendingHtml}` : ''}${isAmerican ? `<h2>Recruit at ${esc(city.name)}</h2><p class="muted">Costs are shared; recruits belong only to this city and take time to train.</p><div class="recruit-grid">${recruitButtons}</div>${transfer}` : `<h2>Settlement</h2><p class="muted">Select an American city, then click this settlement on the map to send an attack force. Its stationed defenders will fight locally.</p>`}${armyCards ? `<h2>Forces on the road</h2>${armyCards}` : ''}`;
  panel.querySelectorAll('[data-recruit]').forEach(button => button.addEventListener('click', () => recruit(city, button.dataset.recruit)));
  panel.querySelector('#dispatch')?.addEventListener('click', () => dispatchFromPanel(city));
}
function renderBattlePanel() {
  const battle = state.battle;
  const attackers = battle.units.filter(u => u.owner === FACTIONS.AMERICAN && u.health > 0);
  const defenders = battle.units.filter(u => u.owner === FACTIONS.BRITISH && u.health > 0);
  const selected = [...state.selectedUnits].map(id => battle.units.find(u => u.id === id)).filter(u => u && u.health > 0);
  const avgHealth = selected.length ? Math.round(selected.reduce((n, u) => n + u.health / u.maxHealth, 0) / selected.length * 100) : 0;
  panel.innerHTML = `<span class="eyebrow">TACTICAL ENGAGEMENT</span><h1>${esc(battle.city.name)}</h1><p class="battle-status"><strong>Continental:</strong> ${attackers.length} &nbsp; <strong>Crown:</strong> ${defenders.length}<br>Time: ${Math.floor(battle.elapsed)} seconds</p><h2>Orders</h2><p class="muted">Click a soldier or drag a box to select. Right-click the field to order selected soldiers to move there. Units fire automatically at nearby enemies.</p><button id="formation-line" class="panel-button secondary" type="button">Line formation</button><button id="formation-hold" class="panel-button secondary" type="button">Hold position</button>${selected.length ? `<h2>Selected: ${selected.length}</h2><p class="muted">${esc(selected[0].type)} · average health ${avgHealth}%</p><div class="unit-health"><span style="width:${avgHealth}%"></span></div>` : '<p class="muted">No units selected.</p>'}<button id="retreat" class="panel-button danger" type="button">Retreat to origin</button>`;
  panel.querySelector('#formation-line').onclick = () => { selected.forEach((unit, i) => { unit.destination = { x: 265 + (i % 8) * 13, y: 380 + Math.floor(i / 8) * 12 }; unit.hold = false; }); };
  panel.querySelector('#formation-hold').onclick = () => selected.forEach(unit => { unit.hold = true; unit.destination = { x: unit.x, y: unit.y }; });
  panel.querySelector('#retreat').onclick = retreatBattle;
}
function recruit(city, type) {
  const stats = UNIT_STATS[type];
  const alreadyTraining = state.recruitments.filter(job => job.cityId === city.id).length;
  if (city.owner !== FACTIONS.AMERICAN || state.money < stats.cost || city.soldierCount + alreadyTraining >= city.recruitmentCapacity) return announce('Recruitment unavailable: check city ownership, money, and local capacity.');
  state.money -= stats.cost;
  state.recruitments.push({ cityId: city.id, type, remaining: stats.time, status: 'training' });
  announce(`${type} recruitment started in ${city.name}. They will join that city's garrison after training.`);
  refresh();
}
function dispatchFromPanel(source) {
  const type = document.querySelector('#move-type')?.value;
  const count = Number(document.querySelector('#move-count')?.value);
  const target = cityById.get(document.querySelector('#move-destination')?.value);
  if (!target || source.owner !== FACTIONS.AMERICAN || ![FACTIONS.AMERICAN, FACTIONS.BRITISH].includes(target.owner)) return announce('Choose a valid destination.');
  if (!Number.isInteger(count) || count < 1 || count > (source.garrison[type] || 0)) return announce('Enter a valid troop count available in this city.');
  dispatch(source, target, { [type]: count });
}
function dispatch(source, target, roster) {
  if (source.owner !== FACTIONS.AMERICAN || source.id === target.id) return;
  const count = rosterTotalCount(roster);
  for (const [type, amount] of Object.entries(roster)) source.garrison[type] -= amount;
  const a = screenPoint(source), b = screenPoint(target);
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  state.armies.push(new TravellingArmy({ id: `army-${Date.now()}-${Math.random()}`, originId: source.id, destinationId: target.id, roster, owner: FACTIONS.AMERICAN, duration: Math.max(5, distance / 25), path: { from: a, to: b } }));
  announce(`${count} troops leave ${source.name} for ${target.name}. They cannot fight until they arrive.`);
  refresh();
}
function rosterTotalCount(roster) { return Object.values(roster).reduce((a, b) => a + b, 0); }
function beginBattle(city, army) {
  const units = [];
  const spawn = (roster, owner, xBase) => {
    for (const [type, count] of Object.entries(roster)) {
      const stats = UNIT_STATS[type];
      for (let i = 0; i < count; i++) units.push({ id: `${owner}-${type}-${i}-${Math.random()}`, type, owner, x: xBase + Math.random() * 65, y: 230 + Math.random() * 360, health: stats.health, maxHealth: stats.health, cooldown: Math.random() * .5, destination: null, hold: false, stats });
    }
  };
  spawn(army.roster, FACTIONS.AMERICAN, 145);
  spawn(city.garrison, FACTIONS.BRITISH, 770);
  // The target roster is now represented only by battle units, preventing duplicate troops.
  for (const type of Object.keys(city.garrison)) city.garrison[type] = 0;
  state.battle = { city, originId: army.originId, units, elapsed: 0, result: null };
  state.selectedUnits.clear();
  document.querySelector('#map-title').textContent = `TACTICAL BATTLE · ${city.name.toUpperCase()}`;
  document.querySelector('#map-help').textContent = 'Select your soldiers · right-click to command them · units fire automatically';
  wrap.classList.add('battle-mode');
  announce(`Battle joined at ${city.name}. Only the arriving force and this city's defenders are present.`);
  refresh();
}
function finishBattle(attackerWins) {
  const battle = state.battle;
  if (!battle) return;
  const attackers = battle.units.filter(u => u.owner === FACTIONS.AMERICAN && u.health > 0);
  const defenders = battle.units.filter(u => u.owner === FACTIONS.BRITISH && u.health > 0);
  const survivorsRoster = unitsToRoster(attackerWins ? attackers : defenders);
  const origin = cityById.get(battle.originId);
  if (attackerWins) {
    battle.city.owner = FACTIONS.AMERICAN;
    mergeRosters(battle.city.garrison, survivorsRoster);
    state.money += 50 + battle.city.income;
    announce(`${battle.city.name} captured. ${rosterTotalCount(survivorsRoster)} surviving attackers are now stationed there.`);
  } else {
    mergeRosters(battle.city.garrison, survivorsRoster);
    mergeRosters(origin.garrison, unitsToRoster(attackers));
    announce(`${battle.city.name} held by the Crown. Surviving attackers returned to ${origin.name}; casualties were removed.`);
  }
  state.battle = null; state.selectedUnits.clear(); state.selectedCityId = attackerWins ? battle.city.id : origin.id;
  document.querySelector('#map-title').textContent = 'THE THIRTEEN COLONIES';
  document.querySelector('#map-help').textContent = 'Select a settlement to inspect it · choose a city, then dispatch a force';
  wrap.classList.remove('battle-mode'); refresh();
}
function unitsToRoster(units) {
  const roster = Object.fromEntries(Object.values(UNIT_TYPES).map(type => [type, 0]));
  for (const unit of units) roster[unit.type]++;
  return roster;
}
function retreatBattle() {
  const battle = state.battle;
  if (!battle) return;
  const attackers = battle.units.filter(u => u.owner === FACTIONS.AMERICAN && u.health > 0);
  const origin = cityById.get(battle.originId);
  mergeRosters(origin.garrison, unitsToRoster(attackers));
  mergeRosters(battle.city.garrison, unitsToRoster(battle.units.filter(u => u.owner === FACTIONS.BRITISH && u.health > 0)));
  announce(`The surviving force withdrew to ${origin.name}. The Crown retains ${battle.city.name}.`);
  state.battle = null; state.selectedUnits.clear(); state.selectedCityId = origin.id;
  document.querySelector('#map-title').textContent = 'THE THIRTEEN COLONIES';
  document.querySelector('#map-help').textContent = 'Select a settlement to inspect it · choose a city, then dispatch a force';
  wrap.classList.remove('battle-mode'); refresh();
}
function updateBattle(dt) {
  const battle = state.battle;
  if (!battle) return;
  battle.elapsed += dt;
  const alive = battle.units.filter(u => u.health > 0);
  for (const unit of alive) {
    unit.cooldown -= dt;
    let target = null, nearest = Infinity;
    for (const other of alive) {
      if (other.owner === unit.owner) continue;
      const d = Math.hypot(other.x - unit.x, other.y - unit.y);
      if (d < nearest) { nearest = d; target = other; }
    }
    const range = Math.max(26, unit.stats.range * .72);
    if (target && nearest <= range) {
      if (unit.cooldown <= 0) { target.health -= unit.stats.damage * (.45 + Math.random() * .18); unit.cooldown = unit.type === UNIT_TYPES.ARTILLERY ? 1.6 : 1.15; }
    } else if (target && !unit.hold) {
      const destination = unit.destination || target;
      const dx = destination.x - unit.x, dy = destination.y - unit.y, length = Math.hypot(dx, dy) || 1;
      const speed = unit.stats.speed * .34;
      unit.x += dx / length * Math.min(length, speed * dt); unit.y += dy / length * Math.min(length, speed * dt);
    }
    unit.x = Math.max(45, Math.min(955, unit.x)); unit.y = Math.max(140, Math.min(750, unit.y));
  }
  const attackers = battle.units.filter(u => u.owner === FACTIONS.AMERICAN && u.health > 0).length;
  const defenders = battle.units.filter(u => u.owner === FACTIONS.BRITISH && u.health > 0).length;
  if (defenders === 0) finishBattle(true);
  else if (attackers === 0) finishBattle(false);
}
function update(dt) {
  state.incomeClock += dt;
  if (state.incomeClock >= state.incomePeriod) {
    state.incomeClock -= state.incomePeriod;
    const income = campaign.cities.filter(city => city.owner === FACTIONS.AMERICAN).reduce((sum, city) => sum + city.income, 0);
    state.money += Math.max(1, Math.floor(income / 8));
    announce(`Campaign income received: £${Math.max(1, Math.floor(income / 8))}.`);
    updateHeader();
  }
  for (const job of [...state.recruitments]) {
    job.remaining -= dt;
    if (job.remaining <= 0) {
      const city = cityById.get(job.cityId);
      city.garrison[job.type]++;
      state.recruitments.splice(state.recruitments.indexOf(job), 1);
      announce(`${job.type} recruitment completed in ${city.name}; the soldiers are now stationed there.`);
      refresh();
    }
  }
  for (const army of [...state.armies]) {
    army.update(dt);
    if (army.progress >= 1) {
      const city = cityById.get(army.destinationId);
      state.armies.splice(state.armies.indexOf(army), 1);
      if (city.owner === FACTIONS.AMERICAN) {
        mergeRosters(city.garrison, army.roster);
        announce(`${army.soldierCount} soldiers arrived at ${city.name} and joined its garrison.`);
      } else if (city.soldierCount === 0) {
        city.owner = FACTIONS.AMERICAN; mergeRosters(city.garrison, army.roster);
        state.money += 50 + city.income;
        announce(`${city.name} is captured. Arriving troops now belong to its local garrison.`);
      } else beginBattle(city, army);
      refresh();
    }
  }
  if (state.battle) updateBattle(dt);
  if (!state.battle && state.year < 1783 && Math.floor((Date.now() - startTime) / 120000) + 1775 > state.year) {
    state.year++;
    if (state.year === 1776) announce('1776: The Declaration of Independence is adopted. This campaign map is a simplified game scenario.');
    else announce(`Campaign year ${state.year}. Historical milestones and scenarios are still in development.`);
    updateHeader();
  }
}
const startTime = Date.now();
function drawMap() {
  ctx.fillStyle = '#d9cfb3'; ctx.fillRect(0, 0, MAP.width, MAP.height);
  ctx.fillStyle = '#82999a'; ctx.beginPath(); ctx.moveTo(751, 0); ctx.bezierCurveTo(700, 100, 793, 140, 740, 232); ctx.bezierCurveTo(710, 300, 762, 350, 702, 442); ctx.bezierCurveTo(667, 520, 709, 586, 635, 820); ctx.lineTo(1000, 820); ctx.lineTo(1000, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#776b52'; ctx.font = 'italic 15px Georgia'; ctx.fillText('ATLANTIC OCEAN', 812, 420);
  ctx.fillStyle = 'rgba(92,75,47,.65)'; ctx.font = 'bold 12px Georgia'; ctx.fillText('NEW ENGLAND', 683, 72); ctx.fillText('MIDDLE COLONIES', 558, 320); ctx.fillText('SOUTHERN COLONIES', 364, 626);
  ctx.strokeStyle = '#8ea8a1'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(516, 108); ctx.bezierCurveTo(541, 205, 506, 258, 530, 343); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(455, 396); ctx.bezierCurveTo(489, 410, 511, 434, 533, 474); ctx.stroke();
  ctx.fillStyle = '#687e78'; ctx.font = 'italic 11px Georgia'; ctx.fillText('Hudson River', 488, 238); ctx.fillText('Potomac River', 451, 443);
  ctx.strokeStyle = 'rgba(119,86,50,.72)'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
  for (const [fromId, toId] of campaign.roads) { const from = cityById.get(fromId), to = cityById.get(toId); if (from && to) { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); } }
  ctx.setLineDash([]);
  for (const city of campaign.cities) {
    const selected = city.id === state.selectedCityId, r = selected ? 11 : 8;
    ctx.beginPath(); ctx.arc(city.x, city.y, r + 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(242,235,216,.72)'; ctx.fill();
    ctx.beginPath(); ctx.arc(city.x, city.y, r, 0, Math.PI * 2); ctx.fillStyle = city.owner === FACTIONS.AMERICAN ? '#506f91' : '#a64e43'; ctx.fill();
    ctx.lineWidth = selected ? 3 : 1.5; ctx.strokeStyle = selected ? '#f5e6b8' : '#f2e8d2'; ctx.stroke();
    ctx.fillStyle = '#332f25'; ctx.font = `${selected ? 'bold ' : ''}14px Georgia`; ctx.textAlign = 'left'; ctx.fillText(city.name, city.x + 14, city.y + 5);
    if (city.soldierCount) { ctx.fillStyle = city.owner === FACTIONS.AMERICAN ? '#354d66' : '#78372f'; ctx.font = 'bold 10px Arial'; ctx.fillText(String(city.soldierCount), city.x - 4, city.y + 3); }
  }
  for (const army of state.armies) {
    const p = army.position; ctx.strokeStyle = '#405d7b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(army.path.from.x, army.path.from.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#f2d794'; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
    ctx.fillStyle = '#312d24'; ctx.font = 'bold 11px Arial'; ctx.fillText(String(army.soldierCount), p.x + 9, p.y - 7);
  }
}
function drawBattle() {
  ctx.fillStyle = '#9b916d'; ctx.fillRect(0, 0, MAP.width, MAP.height);
  ctx.fillStyle = '#6e7953'; ctx.fillRect(20, 120, 960, 630);
  // Fields and a road bisect the combat area.
  ctx.fillStyle = '#827b5b'; ctx.fillRect(20, 430, 960, 45);
  ctx.strokeStyle = '#d2bd8c'; ctx.lineWidth = 3; ctx.setLineDash([15, 11]); ctx.beginPath(); ctx.moveTo(20, 452); ctx.lineTo(980, 452); ctx.stroke(); ctx.setLineDash([]);
  // Settlement buildings and scattered cover.
  for (const [x, y] of [[455, 225], [500, 220], [470, 270], [535, 260], [485, 315]]) {
    ctx.fillStyle = '#76614a'; ctx.fillRect(x, y, 34, 27); ctx.fillStyle = '#493c31'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 17, y - 16); ctx.lineTo(x + 38, y); ctx.fill();
  }
  for (const [x, y] of [[390, 600], [430, 660], [590, 610], [630, 680], [370, 700]]) {
    ctx.fillStyle = '#41573d'; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#324631'; ctx.beginPath(); ctx.arc(x - 6, y - 8, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f1e4be'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText(`ENGAGEMENT AT ${state.battle.city.name.toUpperCase()}`, 500, 152);
  for (const unit of state.battle.units) {
    if (unit.health <= 0) continue;
    const selected = state.selectedUnits.has(unit.id);
    ctx.beginPath(); ctx.arc(unit.x, unit.y, selected ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = unit.owner === FACTIONS.AMERICAN ? '#456c96' : '#a64e43'; ctx.fill();
    if (selected) { ctx.strokeStyle = '#f4d982'; ctx.lineWidth = 2; ctx.stroke(); }
    const pct = Math.max(0, unit.health / unit.maxHealth);
    ctx.fillStyle = '#40362c'; ctx.fillRect(unit.x - 6, unit.y - 10, 12, 2);
    ctx.fillStyle = pct > .5 ? '#91b77c' : '#d1a153'; ctx.fillRect(unit.x - 6, unit.y - 10, 12 * pct, 2);
  }
  if (state.mouseDown?.dragging) {
    ctx.strokeStyle = '#f5e6b8'; ctx.fillStyle = 'rgba(220,207,166,.14)';
    const { x, y, currentX, currentY } = state.mouseDown;
    ctx.fillRect(x, y, currentX - x, currentY - y); ctx.strokeRect(x, y, currentX - x, currentY - y);
  }
}
function draw() {
  if (!ctx || !width || !height) return;
  ctx.clearRect(0, 0, width, height);
  const t = transform(); ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.scale, t.scale);
  if (state.battle) drawBattle(); else drawMap();
  ctx.restore();
}
function nearestCity(x, y) {
  let nearest = null, best = Infinity;
  for (const city of campaign.cities) { const p = screenPoint(city), d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; nearest = city; } }
  return best <= 24 ? nearest : null;
}
canvas.addEventListener('click', event => {
  if (state.battle) return;
  const rect = canvas.getBoundingClientRect(); const city = nearestCity(event.clientX - rect.left, event.clientY - rect.top);
  if (!city) return;
  const selected = cityById.get(state.selectedCityId);
  if (city.owner === FACTIONS.BRITISH && selected?.owner === FACTIONS.AMERICAN && selected.soldierCount > 0) {
    const roster = { ...selected.garrison };
    for (const type of Object.keys(selected.garrison)) selected.garrison[type] = 0;
    const a = screenPoint(selected), b = screenPoint(city), distance = Math.hypot(city.x - selected.x, city.y - selected.y);
    state.armies.push(new TravellingArmy({ id: `attack-${Date.now()}`, originId: selected.id, destinationId: city.id, roster, owner: FACTIONS.AMERICAN, duration: Math.max(5, distance / 25), path: { from: a, to: b } }));
    announce(`${rosterTotalCount(roster)} troops march from ${selected.name} toward ${city.name}.`);
    refresh(); return;
  }
  state.selectedCityId = city.id; renderPanel(); draw();
});
canvas.addEventListener('pointerdown', event => {
  if (!state.battle || event.button !== 0) return;
  const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
  state.mouseDown = { x, y, currentX: x, currentY: y, dragging: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!state.battle || !state.mouseDown) return;
  const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
  state.mouseDown.currentX = x; state.mouseDown.currentY = y;
  if (Math.hypot(x - state.mouseDown.x, y - state.mouseDown.y) > 5) state.mouseDown.dragging = true;
  draw();
});
canvas.addEventListener('pointerup', event => {
  if (!state.battle || !state.mouseDown) return;
  const box = state.mouseDown, rect = canvas.getBoundingClientRect();
  const start = worldPoint(box.x, box.y), end = worldPoint(event.clientX - rect.left, event.clientY - rect.top);
  if (box.dragging) {
    state.selectedUnits.clear();
    for (const unit of state.battle.units) if (unit.owner === FACTIONS.AMERICAN && unit.health > 0 && unit.x >= Math.min(start.x, end.x) && unit.x <= Math.max(start.x, end.x) && unit.y >= Math.min(start.y, end.y) && unit.y <= Math.max(start.y, end.y)) state.selectedUnits.add(unit.id);
  } else {
    const clicked = state.battle.units.find(unit => unit.owner === FACTIONS.AMERICAN && unit.health > 0 && Math.hypot(unit.x - start.x, unit.y - start.y) < 14);
    state.selectedUnits.clear(); if (clicked) state.selectedUnits.add(clicked.id);
  }
  state.mouseDown = null; renderPanel(); draw();
});
canvas.addEventListener('contextmenu', event => {
  event.preventDefault();
  if (!state.battle || !state.selectedUnits.size) return;
  const rect = canvas.getBoundingClientRect(), target = worldPoint(event.clientX - rect.left, event.clientY - rect.top);
  const selected = [...state.selectedUnits].map(id => state.battle.units.find(unit => unit.id === id)).filter(Boolean);
  selected.forEach((unit, i) => { unit.destination = { x: target.x + (i % 5) * 12, y: target.y + Math.floor(i / 5) * 12 }; unit.hold = false; });
});
document.querySelector('#history-button').addEventListener('click', () => document.querySelector('#about-dialog').showModal());
window.addEventListener('resize', resize);
function frame(timestamp) {
  const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0; lastFrame = timestamp;
  update(dt); draw(); requestAnimationFrame(frame);
}
resize(); refresh(); requestAnimationFrame(frame);
