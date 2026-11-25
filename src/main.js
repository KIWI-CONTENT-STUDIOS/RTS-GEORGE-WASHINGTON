import { FACTIONS } from './config.js';
import { createCampaignMap } from './campaign.js';
import { TravellingArmy } from './models.js';
import { mergeRosters, rosterCount } from './gameRules.js';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const panel = document.querySelector('#city-panel');
const americanCount = document.querySelector('#american-count');
const britishCount = document.querySelector('#british-count');
const toast = document.querySelector('#toast');
const campaign = createCampaignMap();
const cityById = new Map(campaign.cities.map(city => [city.id, city]));
const state = { selectedCityId: 'philadelphia', armies: [], transferType: null, transferCount: 1, destinationId: '', attackTargetId: null };
const MAP = { width: 1000, height: 820 };
let toastTimer;
let lastFrame = 0;
let width = 0;
let height = 0;
let dpr = 1;

function mapTransform() {
  const scale = Math.min(width / MAP.width, height / MAP.height);
  return { scale, x: (width - MAP.width * scale) / 2, y: (height - MAP.height * scale) / 2 };
}
function mapPoint(city) {
  const t = mapTransform();
  return { x: t.x + city.x * t.scale, y: t.y + city.y * t.scale };
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height; dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function announce(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function allSoldiers(faction) {
  const stationed = campaign.cities.filter(city => city.owner === faction).reduce((sum, city) => sum + city.soldierCount, 0);
  return stationed + state.armies.filter(army => army.owner === faction).reduce((sum, army) => sum + army.soldierCount, 0);
}
function refresh() {
  americanCount.textContent = allSoldiers(FACTIONS.AMERICAN);
  britishCount.textContent = allSoldiers(FACTIONS.BRITISH);
  renderPanel(); draw();
}
function renderPanel() {
  const city = cityById.get(state.selectedCityId);
  if (!city) {
    panel.innerHTML = '<div class="empty-state"><span class="eyebrow">CAMPAIGN MAP</span><h1>Select a settlement</h1><p>Choose a town on the map to inspect its ownership and locally stationed garrison.</p><p class="muted">The campaign roster is calculated from individual city garrisons and travelling forces.</p></div>';
    return;
  }
  const isAmerican = city.owner === FACTIONS.AMERICAN;
  const roster = Object.entries(city.garrison).filter(([, count]) => count > 0);
  const rows = roster.length ? roster.map(([type, count]) => `<div class="garrison-row"><span>${escapeHtml(type)}</span><strong>${count}</strong></div>`).join('') : '<p class="muted">No soldiers are stationed here.</p>';
  const localArmies = state.armies.filter(army => army.originId === city.id || army.destinationId === city.id);
  const travelHtml = localArmies.length ? `<h2>Forces on the road</h2>${localArmies.map(army => {
    const origin = cityById.get(army.originId), destination = cityById.get(army.destinationId);
    const direction = army.originId === city.id ? `To ${destination.name}` : `From ${origin.name}`;
    const pct = Math.round(army.progress * 100);
    return `<div class="army-card"><strong>${direction}</strong><br>${army.soldierCount} soldiers · ${pct}% of journey</div>`;
  }).join('')}` : '';
  const destinations = campaign.cities.filter(target => target.id !== city.id && target.owner === FACTIONS.AMERICAN);
  const transferControls = isAmerican && city.soldierCount ? `<div class="panel-card"><label for="transfer-type">Soldier class to transfer</label><select id="transfer-type">${roster.map(([type, count]) => `<option value="${escapeHtml(type)}">${escapeHtml(type)} (${count})</option>`).join('')}</select><label for="transfer-count" style="margin-top:10px">Number of soldiers</label><input id="transfer-count" type="number" min="1" max="${city.soldierCount}" value="1"><label for="transfer-destination" style="margin-top:10px">Friendly destination</label><select id="transfer-destination"><option value="">Choose a city…</option>${destinations.map(target => `<option value="${target.id}">${escapeHtml(target.name)}</option>`).join('')}</select><button id="send-army" class="panel-button secondary" type="button">Dispatch transfer</button></div>` : '';
  const attackControl = !isAmerican ? city.soldierCount === 0 ? '<p class="muted">Unoccupied Crown settlement. Select a friendly city with troops, then choose this town to send a force and claim it on arrival.</p>' : '<p class="muted">This settlement has defenders. Attacking is unavailable until tactical battles are implemented in a later phase.</p>' : '';
  panel.innerHTML = `<span class="eyebrow">SETTLEMENT RECORD</span><h1>${escapeHtml(city.name)}</h1><span class="owner-tag ${isAmerican ? 'american' : 'british'}">${isAmerican ? 'Continental' : 'Crown'} control</span><p>${city.income} campaign income · ${city.soldierCount} stationed / ${city.recruitmentCapacity} capacity</p><h2>Local garrison</h2><p class="muted">These troops belong to ${escapeHtml(city.name)}. Troops elsewhere do not join its garrison automatically.</p>${rows}${transferControls}${attackControl}${travelHtml}`;
  panel.querySelector('#transfer-type')?.addEventListener('change', event => { state.transferType = event.target.value; });
  panel.querySelector('#transfer-count')?.addEventListener('input', event => { state.transferCount = Number(event.target.value); });
  panel.querySelector('#transfer-destination')?.addEventListener('change', event => { state.destinationId = event.target.value; });
  panel.querySelector('#send-army')?.addEventListener('click', () => sendTransfer(city));
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function sendTransfer(source) {
  const type = document.querySelector('#transfer-type')?.value;
  const count = Number(document.querySelector('#transfer-count')?.value);
  const destination = cityById.get(document.querySelector('#transfer-destination')?.value);
  if (source.owner !== FACTIONS.AMERICAN || !destination || destination.owner !== FACTIONS.AMERICAN) return announce('Choose a friendly city as the destination.');
  if (!Number.isInteger(count) || count < 1 || count > source.garrison[type]) return announce('Enter a valid number from this city garrison.');
  source.garrison[type] -= count;
  const a = mapPoint(source), b = mapPoint(destination);
  const distance = Math.hypot(destination.x - source.x, destination.y - source.y);
  state.armies.push(new TravellingArmy({ id: crypto.randomUUID?.() || `army-${Date.now()}`, originId: source.id, destinationId: destination.id, roster: { [type]: count }, owner: FACTIONS.AMERICAN, duration: Math.max(5, distance / 24), path: { from: a, to: b } }));
  state.destinationId = '';
  announce(`${count} ${type} dispatched from ${source.name} to ${destination.name}. They are no longer in the origin garrison.`);
  refresh();
}
function startAttack(origin, target) {
  if (origin.owner !== FACTIONS.AMERICAN || !origin.soldierCount) return announce('Select a Continental city with stationed troops before targeting an enemy settlement.');
  if (target.owner === FACTIONS.AMERICAN) return;
  if (target.soldierCount) return announce(`${target.name} has defenders. Tactical battle encounters are not implemented in Phase 1.`);
  const roster = { ...origin.garrison };
  Object.keys(origin.garrison).forEach(type => { origin.garrison[type] = 0; });
  const a = mapPoint(origin), b = mapPoint(target);
  const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
  state.armies.push(new TravellingArmy({ id: `army-${Date.now()}`, originId: origin.id, destinationId: target.id, roster, owner: FACTIONS.AMERICAN, duration: Math.max(5, distance / 24), path: { from: a, to: b } }));
  state.attackTargetId = target.id;
  announce(`Force departed ${origin.name} for ${target.name}. It will occupy the unguarded settlement on arrival.`);
  refresh();
}
function update(dt) {
  let changed = false;
  for (const army of [...state.armies]) {
    army.update(dt);
    if (army.progress >= 1) {
      const target = cityById.get(army.destinationId);
      if (army.owner === FACTIONS.AMERICAN && target.owner === FACTIONS.BRITISH && target.soldierCount === 0) {
        target.owner = FACTIONS.AMERICAN;
        mergeRosters(target.garrison, army.roster);
        announce(`${target.name} is now under Continental control. The arriving troops are stationed there.`);
      } else if (target.owner === FACTIONS.AMERICAN) {
        mergeRosters(target.garrison, army.roster);
        announce(`${army.soldierCount} soldiers arrived at ${target.name} and joined its local garrison.`);
      } else {
        const origin = cityById.get(army.originId);
        mergeRosters(origin.garrison, army.roster);
        announce(`The route to ${target.name} is not available. The force returned to ${origin.name}; no battle was simulated.`);
      }
      state.armies.splice(state.armies.indexOf(army), 1);
      changed = true;
    }
  }
  if (changed) refresh();
}
function pathRoad(from, to) {
  const a = mapPoint(cityById.get(from)), b = mapPoint(cityById.get(to));
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function draw() {
  if (!ctx || !width || !height) return;
  ctx.clearRect(0, 0, width, height);
  const t = mapTransform();
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.scale, t.scale);
  ctx.fillStyle = '#d9cfb3'; ctx.fillRect(0, 0, MAP.width, MAP.height);
  // Atlantic and a simplified eastern coastline.
  ctx.fillStyle = '#82999a'; ctx.beginPath(); ctx.moveTo(751, 0); ctx.bezierCurveTo(700, 100, 793, 140, 740, 232); ctx.bezierCurveTo(710, 300, 762, 350, 702, 442); ctx.bezierCurveTo(667, 520, 709, 586, 635, 820); ctx.lineTo(1000, 820); ctx.lineTo(1000, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(230,232,212,.23)'; ctx.beginPath(); ctx.ellipse(850, 130, 130, 300, -.1, 0, Math.PI * 2); ctx.fill();
  // Light parchment grain and colony guide marks.
  ctx.strokeStyle = 'rgba(102,88,60,.13)'; ctx.lineWidth = 1;
  for (let y = 110; y < 760; y += 95) { ctx.beginPath(); ctx.moveTo(85, y); ctx.lineTo(735, y - 25); ctx.stroke(); }
  ctx.fillStyle = '#776b52'; ctx.font = 'italic 15px Georgia'; ctx.fillText('ATLANTIC OCEAN', 812, 420);
  ctx.fillStyle = 'rgba(92,75,47,.65)'; ctx.font = 'bold 12px Georgia'; ctx.fillText('NEW ENGLAND', 683, 72); ctx.fillText('MIDDLE COLONIES', 558, 320); ctx.fillText('SOUTHERN COLONIES', 364, 626);
  // Rivers.
  ctx.strokeStyle = '#8ea8a1'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(516, 108); ctx.bezierCurveTo(541, 205, 506, 258, 530, 343); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(455, 396); ctx.bezierCurveTo(489, 410, 511, 434, 533, 474); ctx.stroke();
  ctx.fillStyle = '#687e78'; ctx.font = 'italic 11px Georgia'; ctx.fillText('Hudson River', 488, 238); ctx.fillText('Potomac River', 451, 443);
  // Roads.
  ctx.strokeStyle = 'rgba(119,86,50,.72)'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
  for (const [from, to] of campaign.roads) pathRoad(from, to);
  ctx.setLineDash([]);
  // Settlements.
  for (const city of campaign.cities) {
    const selected = city.id === state.selectedCityId;
    const radius = selected ? 11 : 8;
    ctx.beginPath(); ctx.arc(city.x, city.y, radius + 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(242,235,216,.72)'; ctx.fill();
    ctx.beginPath(); ctx.arc(city.x, city.y, radius, 0, Math.PI * 2); ctx.fillStyle = city.owner === FACTIONS.AMERICAN ? '#506f91' : '#a64e43'; ctx.fill();
    ctx.lineWidth = selected ? 3 : 1.5; ctx.strokeStyle = selected ? '#f5e6b8' : '#f2e8d2'; ctx.stroke();
    ctx.fillStyle = '#332f25'; ctx.font = `${selected ? 'bold ' : ''}14px Georgia`; ctx.textAlign = 'left'; ctx.fillText(city.name, city.x + 14, city.y + 5);
    if (city.soldierCount > 0) {
      ctx.fillStyle = city.owner === FACTIONS.AMERICAN ? '#354d66' : '#78372f';
      ctx.font = 'bold 10px Arial'; ctx.fillText(String(city.soldierCount), city.x - 4, city.y + 3);
    }
  }
  // Travelling forces: diamond marker and route trail.
  for (const army of state.armies) {
    const position = army.position;
    ctx.strokeStyle = army.owner === FACTIONS.AMERICAN ? '#405d7b' : '#883c34'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(army.path.from.x, army.path.from.y); ctx.lineTo(position.x, position.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(position.x, position.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#f2d794'; ctx.fillRect(-7, -7, 14, 14); ctx.strokeStyle = '#473e2b'; ctx.lineWidth = 1; ctx.strokeRect(-7, -7, 14, 14); ctx.restore();
    ctx.fillStyle = '#312d24'; ctx.font = 'bold 11px Arial'; ctx.fillText(String(army.soldierCount), position.x + 9, position.y - 7);
  }
  ctx.restore();
}
function pointerPosition(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
canvas.addEventListener('click', event => {
  const pointer = pointerPosition(event);
  let nearest = null, nearestDistance = Infinity;
  for (const city of campaign.cities) { const p = mapPoint(city); const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y); if (distance < nearestDistance) { nearest = city; nearestDistance = distance; } }
  if (!nearest || nearestDistance > 22) return;
  const selected = cityById.get(state.selectedCityId);
  if (nearest.owner === FACTIONS.BRITISH && selected?.owner === FACTIONS.AMERICAN) {
    startAttack(selected, nearest);
    if (nearest.soldierCount > 0) { state.selectedCityId = nearest.id; renderPanel(); draw(); }
    return;
  }
  state.selectedCityId = nearest.id;
  state.transferType = null; state.transferCount = 1; state.destinationId = '';
  renderPanel(); draw();
});
document.querySelector('#history-button').addEventListener('click', () => document.querySelector('#about-dialog').showModal());
window.addEventListener('resize', resize);
function frame(timestamp) {
  const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0;
  lastFrame = timestamp; update(dt); draw(); requestAnimationFrame(frame);
}
resize(); refresh(); requestAnimationFrame(frame);
