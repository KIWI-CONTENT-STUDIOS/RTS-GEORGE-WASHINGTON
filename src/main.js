import { Battle } from './battle.js';
import { FACTIONS, UNIT_STATS, UNIT_TYPES } from './config.js';
import { createCampaignMap } from './campaign.js';
import { TravellingArmy } from './models.js';
import { mergeRosters, rosterCount } from './gameRules.js';

const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const topBar = document.querySelector('#top-bar');
const cityPanel = document.querySelector('#city-panel');

const state = {
  mode: 'campaign',
  year: 1775,
  money: 240,
  food: 100,
  supplies: 100,
  selectedCityId: null,
  transferringFrom: null,
  travellingArmies: [],
  battle: null,
};

const campaign = createCampaignMap();
const cityById = new Map(campaign.cities.map(city => [city.id, city]));

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function campaignScale() {
  return {
    x: innerWidth * 0.86 / 440,
    y: innerHeight * 0.84 / 500,
  };
}

function screenPosition(city) {
  const scale = campaignScale();
  return { x: 40 + city.x * scale.x, y: 70 + city.y * scale.y };
}

function recruit(city, type) {
  if (!city || city.owner !== FACTIONS.AMERICAN) return;
  const stats = UNIT_STATS[type];
  if (state.money < stats.cost) return;
  if (city.soldierCount >= city.recruitmentCapacity) return;
  if (city.recruit(type, stats.cost)) state.money -= stats.cost;
  renderCityPanel();
  renderTopBar();
}

function startTransfer(source, type, destinationId) {
  if (!source || !destinationId || source.owner !== FACTIONS.AMERICAN) return;
  const count = source.garrison[type] || 0;
  if (!count) return;
  const destination = cityById.get(destinationId);
  if (!destination || destination.owner !== FACTIONS.AMERICAN) return;

  source.garrison[type] -= count;
  state.travellingArmies.push(new TravellingArmy({
    id: `army-${Date.now()}-${type}`,
    originId: source.id,
    destinationId,
    roster: { [type]: count },
    owner: FACTIONS.AMERICAN,
    origin: screenPosition(source),
    destination: screenPosition(destination),
  }));
  state.transferringFrom = null;
  renderCityPanel();
}

function startAttack(destination) {
  if (destination.owner === FACTIONS.AMERICAN) return;

  let attackingOrigin = state.selectedCityId ? cityById.get(state.selectedCityId) : null;
  if (!attackingOrigin || attackingOrigin.owner !== FACTIONS.AMERICAN) {
    const connected = campaign.cities.filter(city =>
      city.owner === FACTIONS.AMERICAN && campaign.roads?.includes?.([city.id, destination.id])
    );
    attackingOrigin = connected.find(city => city.soldierCount > 0) || null;
  }
  if (!attackingOrigin) return;

  const attackerRoster = { ...attackingOrigin.garrison };
  const defenderRoster = { ...destination.garrison };
  attackingOrigin.garrison = Object.fromEntries(Object.keys(attackerRoster).map(type => [type, 0]));

  state.battle = { city: destination, origin: attackingOrigin, attackerOwner: FACTIONS.AMERICAN, attackerRoster, defenderRoster };
  state.mode = 'battle';
  renderCityPanel();
}

function resolveBattle(attackerWins) {
  const { city, origin, attackerRoster, defenderRoster } = state.battle;
  const result = new Battle(city, attackerRoster, defenderRoster, FACTIONS.AMERICAN).resolve();
  const won = typeof attackerWins === 'boolean' ? attackerWins : result.attackerWins;

  if (won) {
    city.owner = FACTIONS.AMERICAN;
    city.garrison = result.survivingAttackers;
    state.money += 75 + city.income;
  } else {
    city.garrison = result.survivingDefenders;
  }
  mergeRosters(origin.garrison, won ? result.survivingAttackers : {});
  state.mode = 'campaign';
  state.battle = null;
  state.selectedCityId = city.id;
  renderTopBar();
  renderCityPanel();
}

function renderTopBar() {
  topBar.innerHTML = `
    <span>1775 Campaign</span>
    <span>Money: £${state.money}</span>
    <span>Food: ${state.food}</span>
    <span>Supplies: ${state.supplies}</span>
  `;
}

function renderCityPanel() {
  if (state.mode === 'battle') {
    const battle = state.battle;
    cityPanel.innerHTML = `
      <h2>Battle: ${battle.city.name}</h2>
      <p>Defenders: ${rosterCount(battle.defenderRoster)} soldiers</p>
      <p>Attackers: ${rosterCount(battle.attackerRoster)} soldiers</p>
      <p>Only troops assigned to the selected attack force enter this battle.</p>
      <button id="win-battle">Win battle</button>
      <button id="lose-battle">Lose battle</button>
    `;
    document.querySelector('#win-battle').onclick = () => resolveBattle(true);
    document.querySelector('#lose-battle').onclick = () => resolveBattle(false);
    return;
  }

  const city = cityById.get(state.selectedCityId);
  if (!city) {
    cityPanel.innerHTML = '<h2>Campaign Map</h2><p>Select a city to inspect its garrison.</p>';
    return;
  }

  const rosterRows = Object.entries(city.garrison)
    .map(([type, count]) => `<div class="garrison-row"><span>${type}</span><strong>${count}</strong></div>`).join('');

  const recruitButtons = Object.entries(UNIT_TYPES)
    .map(([, type]) => {
      const cost = UNIT_STATS[type].cost;
      const disabled = city.owner !== FACTIONS.AMERICAN || state.money < cost || city.soldierCount >= city.recruitmentCapacity;
      return `<button data-recruit="${type}" ${disabled ? 'disabled' : ''}>Recruit ${type} (£${cost})</button>`;
    }).join('');

  const transferSelect = campaign.cities
    .filter(destination => destination.owner === FACTIONS.AMERICAN && destination.id !== city.id)
    .map(destination => `<option value="${destination.id}">${destination.name}</option>`).join('');

  const transferButtons = Object.entries(city.garrison)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `<button data-transfer="${type}">Send all ${count} ${type}</button>`).join('');

  cityPanel.innerHTML = `
    <h2>${city.name}</h2>
    <p><strong>Owner:</strong> ${city.owner}</p>
    <p><strong>Income:</strong> £${city.income}</p>
    <p><strong>Garrison:</strong> ${city.soldierCount} / ${city.recruitmentCapacity}</p>
    <h3>City garrison</h3>${rosterRows}
    <h3>Recruitment</h3>${recruitButtons}
    ${city.owner === FACTIONS.AMERICAN ? `<h3>Transfer soldiers</h3>
      <label>Destination: <select id="transfer-destination"><option value="">Choose city</option>${transferSelect}</select></label>
      ${transferButtons}` : ''}
    ${city.owner === FACTIONS.BRITISH ? `<button id="attack-city">Attack ${city.name}</button>` : ''}
  `;

  cityPanel.querySelectorAll('[data-recruit]').forEach(button => {
    button.onclick = () => recruit(city, button.dataset.recruit);
  });
  cityPanel.querySelectorAll('[data-transfer]').forEach(button => {
    button.onclick = () => {
      const destinationId = document.querySelector('#transfer-destination')?.value;
      if (destinationId) startTransfer(city, button.dataset.transfer, destinationId);
    };
  });
  document.querySelector('#attack-city')?.addEventListener('click', () => startAttack(city));
}

function drawCampaign() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  const gradient = ctx.createLinearGradient(0, 0, innerWidth, innerHeight);
  gradient.addColorStop(0, '#7b8063');
  gradient.addColorStop(.55, '#aaa27a');
  gradient.addColorStop(1, '#5c704f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.fillStyle = 'rgba(28,69,91,.45)';
  ctx.fillRect(innerWidth * .76, 0, innerWidth * .24, innerHeight);

  ctx.strokeStyle = 'rgba(70,55,38,.65)';
  ctx.lineWidth = 3;
  for (const [fromId, toId] of campaign.roads) {
    const from = screenPosition(cityById.get(fromId));
    const to = screenPosition(cityById.get(toId));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  for (const city of campaign.cities) {
    const point = screenPosition(city);
    ctx.beginPath();
    ctx.arc(point.x, point.y, city.id === state.selectedCityId ? 13 : 10, 0, Math.PI * 2);
    ctx.fillStyle = city.owner === FACTIONS.AMERICAN ? '#4c70a8' : '#b44b43';
    ctx.fill();
    ctx.strokeStyle = '#efe2b7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#201c15';
    ctx.font = '15px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(city.name, point.x, point.y - 16);
  }

  for (const army of state.travellingArmies) {
    const position = army.position;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y - 11);
    ctx.lineTo(position.x - 9, position.y + 8);
    ctx.lineTo(position.x + 9, position.y + 8);
    ctx.closePath();
    ctx.fillStyle = army.owner === FACTIONS.AMERICAN ? '#31558e' : '#973a34';
    ctx.fill();
  }
}

function drawBattle() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#77724f';
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.fillStyle = 'rgba(58,91,55,.7)';
  ctx.fillRect(0, innerHeight * .18, innerWidth, innerHeight * .64);
  ctx.fillStyle = '#514a35';
  ctx.fillRect(innerWidth * .48, 0, innerWidth * .04, innerHeight);

  ctx.font = '28px Georgia';
  ctx.fillStyle = '#f4edda';
  ctx.textAlign = 'center';
  ctx.fillText(`Tactical Battle — ${state.battle.city.name}`, innerWidth / 2, 54);

  const attackerCount = rosterCount(state.battle.attackerRoster);
  const defenderCount = rosterCount(state.battle.defenderRoster);
  ctx.fillStyle = '#4c70a8';
  ctx.fillRect(innerWidth * .18, innerHeight * .5 - 5, Math.max(8, innerWidth * .16), 10);
  ctx.fillStyle = '#b44b43';
  ctx.fillRect(innerWidth * .66, innerHeight * .5 - 5, Math.max(8, innerWidth * .16), 10);
  ctx.font = '16px Georgia';
  ctx.fillText(`${attackerCount} attackers`, innerWidth * .26, innerHeight * .5 - 20);
  ctx.fillText(`${defenderCount} defenders`, innerWidth * .74, innerHeight * .5 - 20);
}

function update(dt) {
  if (state.mode !== 'campaign') return;
  for (const army of [...state.travellingArmies]) {
    army.update(dt);
    if (army.progress >= 1) {
      const destination = cityById.get(army.destinationId);
      mergeRosters(destination.garrison, army.roster);
      state.travellingArmies.splice(state.travellingArmies.indexOf(army), 1);
    }
  }
}

function frame(timestamp) {
  const dt = Math.min(.05, (frame.last ? (timestamp - frame.last) / 1000 : 0));
  frame.last = timestamp;
  update(dt);
  if (state.mode === 'battle') drawBattle(); else drawCampaign();
  requestAnimationFrame(frame);
}

canvas.addEventListener('click', event => {
  if (state.mode !== 'campaign') return;
  const rect = canvas.getBoundingCanvasRect?.();
  const x = event.clientX;
  const y = event.clientY;

  for (const city of campaign.cities) {
    const point = screenPosition(city);
    if (Math.hypot(point.x - x, point.y - y) <= 18) {
      state.selectedCityId = city.id;
      renderCityPanel();
      return;
    }
  }
});

window.addEventListener('resize', resize);
resize();
renderTopBar();
renderCityPanel();
requestAnimationFrame(frame);
