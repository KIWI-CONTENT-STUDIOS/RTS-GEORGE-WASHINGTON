import { FACTIONS, UNIT_TYPES } from './config.js';
import { City } from './models.js';

// Coordinates are map-layout positions, not exact historical survey coordinates.
export function createCampaignMap() {
  const entries = [
    ['boston', 'Boston', 765, 124, FACTIONS.BRITISH, 18, { [UNIT_TYPES.INFANTRY]: 8 }],
    ['concord', 'Concord', 711, 107, FACTIONS.AMERICAN, 9, { [UNIT_TYPES.MILITIA]: 3, [UNIT_TYPES.RIFLEMEN]: 2 }],
    ['new-haven', 'New Haven', 698, 190, FACTIONS.AMERICAN, 8, { [UNIT_TYPES.INFANTRY]: 3 }],
    ['albany', 'Albany', 606, 184, FACTIONS.AMERICAN, 9, { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.RIFLEMEN]: 1 }],
    ['new-york', 'New York', 677, 279, FACTIONS.BRITISH, 20, { [UNIT_TYPES.INFANTRY]: 8, [UNIT_TYPES.ARTILLERY]: 1 }],
    ['trenton', 'Trenton', 631, 347, FACTIONS.AMERICAN, 8, { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.MILITIA]: 2 }],
    ['philadelphia', 'Philadelphia', 574, 390, FACTIONS.AMERICAN, 18, { [UNIT_TYPES.INFANTRY]: 7, [UNIT_TYPES.RIFLEMEN]: 2 }],
    ['valley-forge', 'Valley Forge', 527, 365, FACTIONS.AMERICAN, 5, { [UNIT_TYPES.INFANTRY]: 3 }],
    ['baltimore', 'Baltimore', 551, 469, FACTIONS.AMERICAN, 11, { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.MILITIA]: 2 }],
    ['richmond', 'Richmond', 496, 566, FACTIONS.AMERICAN, 10, { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.RIFLEMEN]: 1 }],
    ['yorktown', 'Yorktown', 545, 626, FACTIONS.BRITISH, 14, { [UNIT_TYPES.INFANTRY]: 6 }],
    ['charleston', 'Charleston', 362, 704, FACTIONS.BRITISH, 16, { [UNIT_TYPES.INFANTRY]: 5 }],
    ['savannah', 'Savannah', 436, 750, FACTIONS.BRITISH, 12, {}],
  ];
  const cities = entries.map(([id, name, x, y, owner, income, garrison]) => new City({
    id, name, x, y, owner, income, garrison,
    recruitmentCapacity: owner === FACTIONS.AMERICAN ? 24 : 30,
  }));
  const roads = [
    ['boston', 'concord'], ['concord', 'new-haven'], ['new-haven', 'albany'], ['new-haven', 'new-york'],
    ['albany', 'new-york'], ['new-york', 'trenton'], ['trenton', 'philadelphia'],
    ['philadelphia', 'valley-forge'], ['philadelphia', 'baltimore'], ['baltimore', 'richmond'],
    ['richmond', 'yorktown'], ['richmond', 'charleston'], ['charleston', 'savannah'],
  ];
  return { cities, roads };
}
